// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Backr} from "../src/Backr.sol";

// Malicious creator that attempts to reenter withdraw
contract ReentrantCreator {
    Backr public backr;
    uint256 public campaignId;
    bool public hasReentered;

    constructor(Backr _backr) {
        backr = _backr;
    }

    function create(
        string memory title,
        string memory description,
        uint256 goal,
        uint64 durationDays
    ) external returns (uint256) {
        campaignId = backr.createCampaign(title, description, goal, durationDays);
        return campaignId;
    }

    function withdraw() external {
        backr.withdraw(campaignId);
    }

    receive() external payable {
        if (!hasReentered) {
            hasReentered = true;
            backr.withdraw(campaignId);
        }
    }
}

// Malicious backer that attempts to reenter refund
contract ReentrantBacker {
    Backr public backr;
    uint256 public campaignId;
    bool public hasReentered;

    constructor(Backr _backr) {
        backr = _backr;
    }

    function pledge(uint256 _campaignId) external payable {
        campaignId = _campaignId;
        backr.pledge{value: msg.value}(_campaignId);
    }

    function refund() external {
        backr.refund(campaignId);
    }

    receive() external payable {
        if (!hasReentered) {
            hasReentered = true;
            backr.refund(campaignId);
        }
    }
}

// Creator contract that rejects native token transfers
contract RejectingCreator {
    Backr public backr;
    uint256 public campaignId;

    constructor(Backr _backr) {
        backr = _backr;
    }

    function create(
        string memory title,
        string memory description,
        uint256 goal,
        uint64 durationDays
    ) external returns (uint256) {
        campaignId = backr.createCampaign(title, description, goal, durationDays);
        return campaignId;
    }

    function withdraw() external {
        backr.withdraw(campaignId);
    }

    receive() external payable {
        revert("REJECTED");
    }
}

// Backer contract that rejects native token transfers
contract RejectingBacker {
    Backr public backr;
    uint256 public campaignId;

    constructor(Backr _backr) {
        backr = _backr;
    }

    function pledge(uint256 _campaignId) external payable {
        campaignId = _campaignId;
        backr.pledge{value: msg.value}(_campaignId);
    }

    function refund() external {
        backr.refund(campaignId);
    }

    receive() external payable {
        revert("REJECTED");
    }
}

contract BackrTest is Test {
    Backr public backr;

    address public creator = address(0xCAFE);
    address public backer1 = address(0xBAC1);
    address public backer2 = address(0xBAC2);
    address public nonBacker = address(0xDEAD);

    function setUp() public {
        backr = new Backr();
        vm.deal(creator, 100 ether);
        vm.deal(backer1, 100 ether);
        vm.deal(backer2, 100 ether);
        vm.deal(nonBacker, 100 ether);
    }

    // 1. createCampaign stores the correct data
    function test_createCampaign_storesCorrectData() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign(
            "Clean Water Project",
            "Providing clean water to communities in need.",
            10 ether,
            14
        );

        assertEq(id, 1);
        assertEq(backr.campaignCount(), 1);

        Backr.Campaign memory c = backr.getCampaign(1);
        assertEq(c.id, 1);
        assertEq(c.creator, creator);
        assertEq(c.title, "Clean Water Project");
        assertEq(c.description, "Providing clean water to communities in need.");
        assertEq(c.goal, 10 ether);
        assertEq(c.deadline, block.timestamp + 14 days);
        assertEq(c.totalRaised, 0);
        assertFalse(c.withdrawn);
    }

    // 1b. createCampaign reverts on empty or over-length title, over-length description, zero goal, duration 0 or >90
    function test_createCampaign_revertsOnInvalidInputs() public {
        vm.startPrank(creator);

        // Empty title
        vm.expectRevert(Backr.InvalidTitle.selector);
        backr.createCampaign("", "Valid description", 1 ether, 10);

        // Over-length title (> 100 bytes)
        string memory longTitle = new string(101);
        vm.expectRevert(Backr.InvalidTitle.selector);
        backr.createCampaign(longTitle, "Valid description", 1 ether, 10);

        // Empty description
        vm.expectRevert(Backr.InvalidDescription.selector);
        backr.createCampaign("Valid Title", "", 1 ether, 10);

        // Over-length description (> 1000 bytes)
        string memory longDesc = new string(1001);
        vm.expectRevert(Backr.InvalidDescription.selector);
        backr.createCampaign("Valid Title", longDesc, 1 ether, 10);

        // Zero goal
        vm.expectRevert(Backr.InvalidGoal.selector);
        backr.createCampaign("Valid Title", "Valid description", 0, 10);

        // Zero duration
        vm.expectRevert(Backr.InvalidDuration.selector);
        backr.createCampaign("Valid Title", "Valid description", 1 ether, 0);

        // Over 90 days duration
        vm.expectRevert(Backr.InvalidDuration.selector);
        backr.createCampaign("Valid Title", "Valid description", 1 ether, 91);

        vm.stopPrank();
    }

    // 2. pledge increases backer's pledge and totalRaised, contract balance equals sum of pledges
    function test_pledge_increasesPledgeAndTotalRaised() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 2 ether}(id);

        assertEq(backr.getPledge(id, backer1), 2 ether);
        assertEq(backr.getCampaign(id).totalRaised, 2 ether);
        assertEq(address(backr).balance, 2 ether);
    }

    // 3. multiple pledges from same backer accumulate, multiple backers tracked separately
    function test_pledge_multiplePledgesAndMultipleBackers() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 10 ether, 7);

        // Backer 1 pledges twice
        vm.prank(backer1);
        backr.pledge{value: 2 ether}(id);
        vm.prank(backer1);
        backr.pledge{value: 3 ether}(id);

        // Backer 2 pledges once
        vm.prank(backer2);
        backr.pledge{value: 4 ether}(id);

        assertEq(backr.getPledge(id, backer1), 5 ether);
        assertEq(backr.getPledge(id, backer2), 4 ether);
        assertEq(backr.getCampaign(id).totalRaised, 9 ether);
        assertEq(address(backr).balance, 9 ether);
    }

    // 4. pledge reverts on 0 value, nonexistent campaign, and after deadline
    function test_pledge_revertsOnInvalidConditions() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 5 ether, 7);

        // Revert on 0 value
        vm.prank(backer1);
        vm.expectRevert(Backr.ZeroPledge.selector);
        backr.pledge{value: 0}(id);

        // Revert on nonexistent campaign
        vm.prank(backer1);
        vm.expectRevert(Backr.CampaignNotFound.selector);
        backr.pledge{value: 1 ether}(999);

        // Revert on campaign id 0
        vm.prank(backer1);
        vm.expectRevert(Backr.CampaignNotFound.selector);
        backr.pledge{value: 1 ether}(0);

        // Warp past deadline
        vm.warp(block.timestamp + 7 days);

        // Revert after deadline
        vm.prank(backer1);
        vm.expectRevert(Backr.CampaignEnded.selector);
        backr.pledge{value: 1 ether}(id);
    }

    // 5. status returns Active before deadline, Successful after when goal met, Failed after when not met
    function test_status_states() public {
        vm.prank(creator);
        uint256 id1 = backr.createCampaign("Campaign 1", "Desc 1", 5 ether, 7);

        vm.prank(creator);
        uint256 id2 = backr.createCampaign("Campaign 2", "Desc 2", 5 ether, 7);

        // Both are Active before deadline
        assertEq(uint256(backr.status(id1)), uint256(Backr.Status.Active));
        assertEq(uint256(backr.status(id2)), uint256(Backr.Status.Active));

        // Campaign 1 meets goal
        vm.prank(backer1);
        backr.pledge{value: 5 ether}(id1);

        // Campaign 2 receives only partial funding
        vm.prank(backer1);
        backr.pledge{value: 2 ether}(id2);

        // Warp past deadline
        vm.warp(block.timestamp + 7 days);

        // Check statuses
        assertEq(uint256(backr.status(id1)), uint256(Backr.Status.Successful));
        assertEq(uint256(backr.status(id2)), uint256(Backr.Status.Failed));
    }

    // 6. withdraw succeeds only for creator, only after deadline, only when goal met, only once
    function test_withdraw_succeedsForCreator() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 6 ether}(id);

        vm.warp(block.timestamp + 7 days);

        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(creator);
        backr.withdraw(id);

        assertEq(creator.balance, creatorBalanceBefore + 6 ether);
        assertTrue(backr.getCampaign(id).withdrawn);
        assertEq(address(backr).balance, 0);
    }

    // 7. withdraw reverts for non-creator, before deadline, when goal not met, and on second call
    function test_withdraw_revertsOnInvalidConditions() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 4 ether}(id);

        // Before deadline
        vm.prank(creator);
        vm.expectRevert(Backr.CampaignNotEnded.selector);
        backr.withdraw(id);

        vm.warp(block.timestamp + 7 days);

        // Non-creator
        vm.prank(backer1);
        vm.expectRevert(Backr.NotCreator.selector);
        backr.withdraw(id);

        // Goal not met (4 ether < 5 ether)
        vm.prank(creator);
        vm.expectRevert(Backr.GoalNotReached.selector);
        backr.withdraw(id);

        // Let's create a successful campaign to test second call
        vm.prank(creator);
        uint256 id2 = backr.createCampaign("Title 2", "Description 2", 5 ether, 7);
        vm.prank(backer1);
        backr.pledge{value: 5 ether}(id2);
        vm.warp(block.timestamp + 7 days);

        vm.prank(creator);
        backr.withdraw(id2);

        // Second call
        vm.prank(creator);
        vm.expectRevert(Backr.AlreadyWithdrawn.selector);
        backr.withdraw(id2);
    }

    // 8. refund returns exact pledge after failed campaign, reverts on successful, before deadline, non-backer, second call
    function test_refund_behavior() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 10 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 3 ether}(id);

        // Revert before deadline
        vm.prank(backer1);
        vm.expectRevert(Backr.CampaignNotEnded.selector);
        backr.refund(id);

        vm.warp(block.timestamp + 7 days);

        // Revert for non-backer
        vm.prank(nonBacker);
        vm.expectRevert(Backr.NoPledge.selector);
        backr.refund(id);

        // Backer 1 claims refund
        uint256 backer1BalBefore = backer1.balance;
        vm.prank(backer1);
        backr.refund(id);

        assertEq(backer1.balance, backer1BalBefore + 3 ether);
        assertEq(backr.getPledge(id, backer1), 0);

        // Revert on second call
        vm.prank(backer1);
        vm.expectRevert(Backr.NoPledge.selector);
        backr.refund(id);

        // Revert on successful campaign
        vm.prank(creator);
        uint256 id2 = backr.createCampaign("Title 2", "Description 2", 5 ether, 7);
        vm.prank(backer2);
        backr.pledge{value: 5 ether}(id2);

        vm.warp(block.timestamp + 7 days);

        vm.prank(backer2);
        vm.expectRevert(Backr.CampaignSuccessful.selector);
        backr.refund(id2);
    }

    // 9. Goal reached exactly (totalRaised == goal) counts as successful
    function test_goalReachedExactlyCountsAsSuccessful() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 5 ether}(id);

        vm.warp(block.timestamp + 7 days);

        assertEq(uint256(backr.status(id)), uint256(Backr.Status.Successful));

        // Creator can withdraw
        uint256 creatorBalBefore = creator.balance;
        vm.prank(creator);
        backr.withdraw(id);
        assertEq(creator.balance, creatorBalBefore + 5 ether);

        // Backer cannot refund
        vm.prank(backer1);
        vm.expectRevert(Backr.CampaignSuccessful.selector);
        backr.refund(id);
    }

    // 10. Overfunding: creator receives full amount raised, not just the goal
    function test_overfunding_creatorReceivesFullAmount() public {
        vm.prank(creator);
        uint256 id = backr.createCampaign("Title", "Description", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 8 ether}(id);

        vm.prank(backer2);
        backr.pledge{value: 4 ether}(id);

        assertEq(backr.getCampaign(id).totalRaised, 12 ether);

        vm.warp(block.timestamp + 7 days);

        uint256 creatorBalBefore = creator.balance;
        vm.prank(creator);
        backr.withdraw(id);

        assertEq(creator.balance, creatorBalBefore + 12 ether);
        assertEq(address(backr).balance, 0);
    }

    // 11. Reentrancy: malicious creator and malicious backer are blocked
    function test_reentrancy_blockedForCreatorAndBacker() public {
        // Creator reentrancy
        ReentrantCreator badCreator = new ReentrantCreator(backr);
        uint256 cId = badCreator.create("Bad Creator", "Desc", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 6 ether}(cId);

        vm.warp(block.timestamp + 7 days);

        // Calling withdraw will re-enter and revert
        vm.expectRevert();
        badCreator.withdraw();

        // Malicious backer reentrancy
        vm.prank(creator);
        uint256 cId2 = backr.createCampaign("Failed Campaign", "Desc", 10 ether, 7);

        ReentrantBacker badBacker = new ReentrantBacker(backr);
        vm.deal(address(badBacker), 2 ether);
        badBacker.pledge{value: 2 ether}(cId2);

        vm.warp(block.timestamp + 7 days);

        // Calling refund will re-enter and revert
        vm.expectRevert();
        badBacker.refund();
    }

    // 12. Rejecting creator or backer reverts cleanly without affecting anyone else
    function test_rejectingCreatorAndBackerRevertCleanly() public {
        // Rejecting creator
        RejectingCreator badCreator = new RejectingCreator(backr);
        uint256 cId = badCreator.create("Rejecting Creator", "Desc", 5 ether, 7);

        vm.prank(backer1);
        backr.pledge{value: 5 ether}(cId);

        vm.warp(block.timestamp + 7 days);

        // Bad creator's withdraw reverts with TransferFailed
        vm.expectRevert(Backr.TransferFailed.selector);
        badCreator.withdraw();

        // Contract balance remains intact
        assertEq(address(backr).balance, 5 ether);
        assertFalse(backr.getCampaign(cId).withdrawn);

        // Rejecting backer
        vm.prank(creator);
        uint256 cId2 = backr.createCampaign("Failed", "Desc", 20 ether, 7);

        RejectingBacker badBacker = new RejectingBacker(backr);
        vm.deal(address(badBacker), 2 ether);
        badBacker.pledge{value: 2 ether}(cId2);

        vm.prank(backer1);
        backr.pledge{value: 3 ether}(cId2);

        vm.warp(block.timestamp + 7 days);

        // Bad backer's refund reverts with TransferFailed
        vm.expectRevert(Backr.TransferFailed.selector);
        badBacker.refund();

        // Normal backer can still refund cleanly
        uint256 backer1BalBefore = backer1.balance;
        vm.prank(backer1);
        backr.refund(cId2);
        assertEq(backer1.balance, backer1BalBefore + 3 ether);
    }

    // 13. Pagination: getCampaigns returns newest first and handles offset/limit edge cases
    function test_pagination_getCampaigns() public {
        // Initially 0 campaigns
        Backr.Campaign[] memory emptyList = backr.getCampaigns(0, 10);
        assertEq(emptyList.length, 0);

        // Create 5 campaigns
        for (uint256 i = 1; i <= 5; i++) {
            vm.prank(creator);
            backr.createCampaign(
                string.concat("Campaign ", vm.toString(i)),
                "Description",
                1 ether * i,
                7
            );
        }

        assertEq(backr.campaignCount(), 5);

        // Page 1: offset 0, limit 2 -> [5, 4]
        Backr.Campaign[] memory page1 = backr.getCampaigns(0, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0].id, 5);
        assertEq(page1[1].id, 4);

        // Page 2: offset 2, limit 2 -> [3, 2]
        Backr.Campaign[] memory page2 = backr.getCampaigns(2, 2);
        assertEq(page2.length, 2);
        assertEq(page2[0].id, 3);
        assertEq(page2[1].id, 2);

        // Page 3: offset 4, limit 2 -> [1]
        Backr.Campaign[] memory page3 = backr.getCampaigns(4, 2);
        assertEq(page3.length, 1);
        assertEq(page3[0].id, 1);

        // Page 4: offset 5, limit 2 -> empty
        Backr.Campaign[] memory page4 = backr.getCampaigns(5, 2);
        assertEq(page4.length, 0);

        // Offset beyond count -> empty
        Backr.Campaign[] memory outOfBounds = backr.getCampaigns(10, 5);
        assertEq(outOfBounds.length, 0);

        // Limit 0 -> empty
        Backr.Campaign[] memory zeroLimit = backr.getCampaigns(0, 0);
        assertEq(zeroLimit.length, 0);

        // Large limit -> returns all 5 newest first
        Backr.Campaign[] memory allCampaigns = backr.getCampaigns(0, 100);
        assertEq(allCampaigns.length, 5);
        assertEq(allCampaigns[0].id, 5);
        assertEq(allCampaigns[1].id, 4);
        assertEq(allCampaigns[2].id, 3);
        assertEq(allCampaigns[3].id, 2);
        assertEq(allCampaigns[4].id, 1);
    }

    // Plain transfers should revert
    function test_plainEtherTransferReverts() public {
        (bool success, ) = address(backr).call{value: 1 ether}("");
        assertFalse(success);
    }
}
