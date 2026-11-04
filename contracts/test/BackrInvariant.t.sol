// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Backr} from "../src/Backr.sol";

contract BackrHandler is Test {
    Backr public backr;
    uint256 public ghost_totalPledges;

    address[] public creators;
    address[] public backers;
    uint256[] public campaignIds;

    constructor(Backr _backr) {
        backr = _backr;

        creators.push(address(0x1001));
        creators.push(address(0x1002));

        backers.push(address(0x2001));
        backers.push(address(0x2002));
        backers.push(address(0x2003));

        for (uint256 i = 0; i < backers.length; i++) {
            vm.deal(backers[i], 1_000_000 ether);
        }
    }

    function createCampaign(uint256 creatorIdx, uint256 goalSeed, uint256 durationSeed) external {
        address creator = creators[creatorIdx % creators.length];
        uint256 goal = _bound(goalSeed, 1 ether, 100 ether);
        uint64 durationDays = uint64(_bound(durationSeed, 1, 90));

        vm.prank(creator);
        uint256 id = backr.createCampaign("Campaign Title", "Campaign Description", goal, durationDays);
        campaignIds.push(id);
    }

    function pledge(uint256 campaignIdxSeed, uint256 backerIdx, uint256 amountSeed) external {
        if (campaignIds.length == 0) return;

        uint256 campaignId = campaignIds[campaignIdxSeed % campaignIds.length];
        Backr.Campaign memory c = backr.getCampaign(campaignId);

        if (block.timestamp >= c.deadline) return;

        address backer = backers[backerIdx % backers.length];
        uint256 amount = _bound(amountSeed, 0.01 ether, 10 ether);

        vm.prank(backer);
        backr.pledge{value: amount}(campaignId);

        ghost_totalPledges += amount;
    }

    function withdraw(uint256 campaignIdxSeed) external {
        if (campaignIds.length == 0) return;

        uint256 campaignId = campaignIds[campaignIdxSeed % campaignIds.length];
        Backr.Campaign memory c = backr.getCampaign(campaignId);

        if (block.timestamp < c.deadline) return;
        if (c.totalRaised < c.goal) return;
        if (c.withdrawn) return;

        vm.prank(c.creator);
        backr.withdraw(campaignId);

        ghost_totalPledges -= c.totalRaised;
    }

    function refund(uint256 campaignIdxSeed, uint256 backerIdx) external {
        if (campaignIds.length == 0) return;

        uint256 campaignId = campaignIds[campaignIdxSeed % campaignIds.length];
        Backr.Campaign memory c = backr.getCampaign(campaignId);

        if (block.timestamp < c.deadline) return;
        if (c.totalRaised >= c.goal) return;

        address backer = backers[backerIdx % backers.length];
        uint256 backerPledge = backr.getPledge(campaignId, backer);
        if (backerPledge == 0) return;

        vm.prank(backer);
        backr.refund(campaignId);

        ghost_totalPledges -= backerPledge;
    }

    function warp(uint256 timeJumpSeed) external {
        uint256 timeJump = _bound(timeJumpSeed, 1 hours, 30 days);
        vm.warp(block.timestamp + timeJump);
    }

    function getCampaignCount() external view returns (uint256) {
        return campaignIds.length;
    }
}

contract BackrInvariantTest is Test {
    Backr public backr;
    BackrHandler public handler;

    function setUp() public {
        backr = new Backr();
        handler = new BackrHandler(backr);

        targetContract(address(handler));
    }

    function invariant_balanceEqualsTotalActivePledges() public view {
        assertEq(
            address(backr).balance,
            handler.ghost_totalPledges(),
            "Contract balance must equal unwithdrawn, unrefunded pledges"
        );
    }
}
