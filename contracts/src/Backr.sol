// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Backr is ReentrancyGuard {
    enum Status {
        Active,
        Successful,
        Failed
    }

    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goal;
        uint64 deadline;
        uint256 totalRaised;
        bool withdrawn;
    }

    // Custom errors
    error InvalidTitle();
    error InvalidDescription();
    error InvalidGoal();
    error InvalidDuration();
    error CampaignNotFound();
    error CampaignEnded();
    error CampaignNotEnded();
    error NotCreator();
    error GoalNotReached();
    error CampaignSuccessful();
    error AlreadyWithdrawn();
    error ZeroPledge();
    error NoPledge();
    error TransferFailed();

    // Events
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint64 deadline
    );
    event Pledged(
        uint256 indexed campaignId,
        address indexed backer,
        uint256 amount,
        uint256 totalRaised
    );
    event Withdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );
    event Refunded(
        uint256 indexed campaignId,
        address indexed backer,
        uint256 amount
    );

    uint256 public campaignCount;
    mapping(uint256 => Campaign) private _campaigns;
    mapping(uint256 => mapping(address => uint256)) public pledges;

    /// @notice Create a new crowdfunding campaign
    /// @param title Campaign title (1-100 bytes)
    /// @param description Campaign description (1-1000 bytes)
    /// @param goal Target funding goal in native tokens (> 0)
    /// @param durationDays Campaign duration in days (1-90)
    function createCampaign(
        string calldata title,
        string calldata description,
        uint256 goal,
        uint64 durationDays
    ) external returns (uint256 campaignId) {
        if (bytes(title).length == 0 || bytes(title).length > 100) {
            revert InvalidTitle();
        }
        if (bytes(description).length == 0 || bytes(description).length > 1000) {
            revert InvalidDescription();
        }
        if (goal == 0) {
            revert InvalidGoal();
        }
        if (durationDays < 1 || durationDays > 90) {
            revert InvalidDuration();
        }

        uint64 deadline = uint64(block.timestamp + durationDays * 1 days);
        campaignId = ++campaignCount;

        _campaigns[campaignId] = Campaign({
            id: campaignId,
            creator: msg.sender,
            title: title,
            description: description,
            goal: goal,
            deadline: deadline,
            totalRaised: 0,
            withdrawn: false
        });

        emit CampaignCreated(campaignId, msg.sender, title, goal, deadline);
    }

    /// @notice Pledge native BOT tokens to an active campaign
    /// @param campaignId Campaign identifier
    function pledge(uint256 campaignId) external payable nonReentrant {
        if (msg.value == 0) {
            revert ZeroPledge();
        }
        if (campaignId == 0 || campaignId > campaignCount) {
            revert CampaignNotFound();
        }

        Campaign storage c = _campaigns[campaignId];
        if (block.timestamp >= c.deadline) {
            revert CampaignEnded();
        }

        pledges[campaignId][msg.sender] += msg.value;
        c.totalRaised += msg.value;

        emit Pledged(campaignId, msg.sender, msg.value, c.totalRaised);
    }

    /// @notice Withdraw funds for a successful campaign (creator only)
    /// @param campaignId Campaign identifier
    function withdraw(uint256 campaignId) external nonReentrant {
        if (campaignId == 0 || campaignId > campaignCount) {
            revert CampaignNotFound();
        }

        Campaign storage c = _campaigns[campaignId];
        if (msg.sender != c.creator) {
            revert NotCreator();
        }
        if (block.timestamp < c.deadline) {
            revert CampaignNotEnded();
        }
        if (c.totalRaised < c.goal) {
            revert GoalNotReached();
        }
        if (c.withdrawn) {
            revert AlreadyWithdrawn();
        }

        c.withdrawn = true;
        uint256 amount = c.totalRaised;

        emit Withdrawn(campaignId, msg.sender, amount);

        (bool success, ) = c.creator.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    /// @notice Claim refund for a failed campaign
    /// @param campaignId Campaign identifier
    function refund(uint256 campaignId) external nonReentrant {
        if (campaignId == 0 || campaignId > campaignCount) {
            revert CampaignNotFound();
        }

        Campaign storage c = _campaigns[campaignId];
        if (block.timestamp < c.deadline) {
            revert CampaignNotEnded();
        }
        if (c.totalRaised >= c.goal) {
            revert CampaignSuccessful();
        }

        uint256 amount = pledges[campaignId][msg.sender];
        if (amount == 0) {
            revert NoPledge();
        }

        pledges[campaignId][msg.sender] = 0;

        emit Refunded(campaignId, msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }

    /// @notice Compute the current derived status of a campaign
    /// @param campaignId Campaign identifier
    function status(uint256 campaignId) public view returns (Status) {
        if (campaignId == 0 || campaignId > campaignCount) {
            revert CampaignNotFound();
        }

        Campaign storage c = _campaigns[campaignId];
        if (block.timestamp < c.deadline) {
            return Status.Active;
        } else if (c.totalRaised >= c.goal) {
            return Status.Successful;
        } else {
            return Status.Failed;
        }
    }

    /// @notice Fetch single campaign details
    /// @param campaignId Campaign identifier
    function getCampaign(uint256 campaignId) external view returns (Campaign memory) {
        if (campaignId == 0 || campaignId > campaignCount) {
            revert CampaignNotFound();
        }
        return _campaigns[campaignId];
    }

    /// @notice Fetch pledge amount of a backer for a campaign
    /// @param campaignId Campaign identifier
    /// @param backer Address of the backer
    function getPledge(uint256 campaignId, address backer) external view returns (uint256) {
        return pledges[campaignId][backer];
    }

    /// @notice Get paginated list of campaigns, newest first
    /// @param offset Number of items to skip from the newest campaign
    /// @param limit Maximum number of campaigns to return
    function getCampaigns(uint256 offset, uint256 limit)
        external
        view
        returns (Campaign[] memory)
    {
        uint256 total = campaignCount;
        if (offset >= total || limit == 0) {
            return new Campaign[](0);
        }

        uint256 remaining = total - offset;
        uint256 count = limit < remaining ? limit : remaining;

        Campaign[] memory result = new Campaign[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 id = total - offset - i;
            result[i] = _campaigns[id];
        }

        return result;
    }
}
