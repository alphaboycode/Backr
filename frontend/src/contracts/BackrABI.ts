export const BACKR_ABI = [
  {
    "type": "function",
    "name": "campaignCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createCampaign",
    "inputs": [
      {
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "goal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "durationDays",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCampaign",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct Backr.Campaign",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "goal",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "totalRaised",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "withdrawn",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCampaigns",
    "inputs": [
      {
        "name": "offset",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "limit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct Backr.Campaign[]",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "goal",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "totalRaised",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "withdrawn",
            "type": "bool",
            "internalType": "bool"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPledge",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "backer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pledge",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "pledges",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "refund",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "status",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum Backr.Status"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "CampaignCreated",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "title",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "goal",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Pledged",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "backer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalRaised",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Refunded",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "backer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "campaignId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyWithdrawn",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignNotEnded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CampaignSuccessful",
    "inputs": []
  },
  {
    "type": "error",
    "name": "GoalNotReached",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidDescription",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidDuration",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidGoal",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidTitle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoPledge",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotCreator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroPledge",
    "inputs": []
  }
] as const;
