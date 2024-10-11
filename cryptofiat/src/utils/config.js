import React from "react";


export const fromBlock = 2463027;//18532910;//0;//17000000;

let config={};
config.localWeb3='';
config.daoAddress = '0x632592bDE6EcB0A653c1f5BD4400721C1AbEfBF4';
config.daoABI = [
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "_addresses",
                "type": "address[]"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "indexed": true,
                "internalType": "string",
                "name": "indexedName",
                "type": "string"
            }
        ],
        "name": "NewVoting",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            }
        ],
        "name": "VotingFailed",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            }
        ],
        "name": "VotingSucceed",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "activeVoting",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "addresses",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "isAuthorized",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "params",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "paused",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "name": "pooled",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "totalPooled",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "votingID",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "name": "votings",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "totalPositive",
                "type": "uint256"
            },
            {
                "internalType": "uint8",
                "name": "votingType",
                "type": "uint8"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "startTime",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "decision",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "renewContracts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint8",
                "name": "votingType",
                "type": "uint8"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            },
            {
                "internalType": "bool",
                "name": "decision",
                "type": "bool"
            }
        ],
        "name": "addVoting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "poolTokens",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "returnTokens",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "bool",
                "name": "_vote",
                "type": "bool"
            }
        ],
        "name": "vote",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "claimToFinalizeCurrentVoting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
config.ruleABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "subtractedValue",
                "type": "uint256"
            }
        ],
        "name": "decreaseAllowance",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "addedValue",
                "type": "uint256"
            }
        ],
        "name": "increaseAllowance",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
config.stableCoinABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "subtractedValue",
                "type": "uint256"
            }
        ],
        "name": "decreaseAllowance",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "spender",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "addedValue",
                "type": "uint256"
            }
        ],
        "name": "increaseAllowance",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "from",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
config.depositABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "rate",
                "type": "uint256"
            },
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "DepositOpened",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "name": "deposits",
        "outputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "coinsDeposited",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "timeOpened",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "period",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "currentInterestRate",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "lastTimeUpdated",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "accumulatedInterest",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "closed",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "depositsCounter",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "renewContracts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "deposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            }
        ],
        "name": "topUp",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            }
        ],
        "name": "overallInterest",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "interest",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            }
        ],
        "name": "updateInterest",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "accumulated",
                "type": "uint256"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "id",
                "type": "uint32"
            }
        ],
        "name": "claimInterest",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
config.cdpABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "posID",
                "type": "uint256"
            }
        ],
        "name": "PositionOpened",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "newStableCoinsAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "ethLocked",
                "type": "uint256"
            }
        ],
        "name": "PositionUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            },
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "collateral",
                "type": "uint256"
            }
        ],
        "name": "liquidateCollateral",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint24",
                "name": "liquidationStatus",
                "type": "uint24"
            }
        ],
        "name": "liquidationStatusChanged",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "numPositions",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "name": "positions",
        "outputs": [
            {
                "internalType": "uint128",
                "name": "coinsMinted",
                "type": "uint128"
            },
            {
                "internalType": "uint128",
                "name": "ethAmountLocked",
                "type": "uint128"
            },
            {
                "internalType": "uint128",
                "name": "interestAmountRecorded",
                "type": "uint128"
            },
            {
                "internalType": "uint32",
                "name": "timeOpened",
                "type": "uint32"
            },
            {
                "internalType": "uint32",
                "name": "lastTimeUpdated",
                "type": "uint32"
            },
            {
                "internalType": "uint24",
                "name": "interestRate",
                "type": "uint24"
            },
            {
                "internalType": "uint32",
                "name": "markedOnLiquidationTimestamp",
                "type": "uint32"
            },
            {
                "internalType": "uint24",
                "name": "liquidationStatus",
                "type": "uint24"
            },
            {
                "internalType": "uint32",
                "name": "liquidationAuctionID",
                "type": "uint32"
            },
            {
                "internalType": "bool",
                "name": "restrictInterestWithdrawal",
                "type": "bool"
            },
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "renewContracts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "stableCoinsToMint",
                "type": "uint256"
            }
        ],
        "name": "openCDP",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "payable",
        "type": "function",
        "payable": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "interestAmountUnrecorded",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "interestAmount",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "totalCurrentFee",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "fee",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "ethValue",
                "type": "uint256"
            }
        ],
        "name": "getMaxStableCoinsToMint",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "getMaxStableCoinsToMintForPos",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "maxAmount",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "beneficiary",
                "type": "address"
            }
        ],
        "name": "claimInterest",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "beneficiary",
                "type": "address"
            }
        ],
        "name": "claimEmission",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "closeCDP",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "transferInterest",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "switchRestrictInterestWithdrawal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "allowSurplusToAuction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "claimMarginCall",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "finishMarginCall",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "markToLiquidate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            }
        ],
        "name": "eraseMarkToLiquidate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            },
            {
                "internalType": "uint256",
                "name": "newStableCoinsAmount",
                "type": "uint256"
            }
        ],
        "name": "updateCDP",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "payable",
        "type": "function",
        "payable": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "posID",
                "type": "uint32"
            },
            {
                "internalType": "uint128",
                "name": "etherToWithdraw",
                "type": "uint128"
            }
        ],
        "name": "withdrawEther",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "burnRule",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "to",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "mintRule",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];
config.cartABI = [
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "name": "instrumentAdded",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "name": "shareChanged",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "dictionary",
        "outputs": [
            {
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            }
        ],
        "name": "items",
        "outputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "internalType": "uint16",
                "name": "share",
                "type": "uint16"
            },
            {
                "internalType": "uint256",
                "name": "initialPrice",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "itemsCount",
        "outputs": [
            {
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "sharesCount",
        "outputs": [
            {
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "renewContracts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "internalType": "uint16",
                "name": "share",
                "type": "uint16"
            },
            {
                "internalType": "uint256",
                "name": "initialPrice",
                "type": "uint256"
            }
        ],
        "name": "addItem",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            },
            {
                "internalType": "uint16",
                "name": "share",
                "type": "uint16"
            }
        ],
        "name": "setShare",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCurrentSharePriceChange",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "priceChange",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "getEthereumVSCommoditiesPriceChange",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "getPrice",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "getDecimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "_decimals",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    }
];
config.oracleABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "payable",
        "type": "constructor",
        "payable": true
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "name": "highVolatility",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "name": "priceUpdateRequest",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "name": "priceUpdated",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "profit",
                "type": "uint256"
            }
        ],
        "name": "profit",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint16[]",
                "name": "ids",
                "type": "uint16[]"
            }
        ],
        "name": "severalPricesUpdateRequest",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "author",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "beneficiary",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "name": "dictionary",
        "outputs": [
            {
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "finalized",
        "outputs": [
            {
                "internalType": "bool",
                "name": "",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            }
        ],
        "name": "instruments",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "price",
                "type": "uint256"
            },
            {
                "internalType": "uint128",
                "name": "timeStamp",
                "type": "uint128"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "instrumentsCount",
        "outputs": [
            {
                "internalType": "uint16",
                "name": "",
                "type": "uint16"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "updAdditionalPrice",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "updOnePriceGasCost",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "updSeveralPricesCost",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "updater",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "newAddress",
                "type": "address"
            }
        ],
        "name": "changeBeneficiaryAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "finalize",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address payable",
                "name": "newAddress",
                "type": "address"
            }
        ],
        "name": "changeUpdaterAddress",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "name": "requestPriceUpdate",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
        "payable": true
    },
    {
        "inputs": [
            {
                "internalType": "uint16[]",
                "name": "ids",
                "type": "uint16[]"
            }
        ],
        "name": "requestMultiplePricesUpdate",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
        "payable": true
    },
    {
        "inputs": [
            {
                "internalType": "uint16[]",
                "name": "ids",
                "type": "uint16[]"
            },
            {
                "internalType": "uint256[]",
                "name": "prices",
                "type": "uint256[]"
            }
        ],
        "name": "updateSeveralPrices",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "transferProfit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            },
            {
                "internalType": "uint256",
                "name": "newPrice",
                "type": "uint256"
            }
        ],
        "name": "updateSinglePrice",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
            }
        ],
        "name": "addInstrument",
        "outputs": [
            {
                "internalType": "uint16",
                "name": "id",
                "type": "uint16"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint8",
                "name": "decimals",
                "type": "uint8"
            }
        ],
        "name": "updateInstrument",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "getPrice",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "timeStamp",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "symbol",
                "type": "string"
            }
        ],
        "name": "getDecimals",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "",
                "type": "uint8"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    }
];
config.auctionABI =[
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_INTDAOaddress",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "lotAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "uint32",
                "name": "bestBidID",
                "type": "uint32"
            }
        ],
        "name": "auctionFinished",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "bidID",
                "type": "uint256"
            }
        ],
        "name": "bidCanceled",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "uint8",
                "name": "auctionType",
                "type": "uint8"
            },
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "lotAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "lotAddress",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "paymentAmount",
                "type": "uint256"
            }
        ],
        "name": "newAuction",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            },
            {
                "indexed": true,
                "internalType": "uint32",
                "name": "bidID",
                "type": "uint32"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "bidAmount",
                "type": "uint256"
            },
            {
                "indexed": false,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "newBid",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "auctionNum",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "name": "auctions",
        "outputs": [
            {
                "internalType": "uint8",
                "name": "auctionType",
                "type": "uint8"
            },
            {
                "internalType": "bool",
                "name": "initialized",
                "type": "bool"
            },
            {
                "internalType": "bool",
                "name": "finalized",
                "type": "bool"
            },
            {
                "internalType": "address",
                "name": "lotToken",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "lotAmount",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "paymentToken",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "paymentAmount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "initTime",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "lastTimeUpdated",
                "type": "uint256"
            },
            {
                "internalType": "uint32",
                "name": "bestBidID",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "name": "bids",
        "outputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            },
            {
                "internalType": "uint256",
                "name": "bidAmount",
                "type": "uint256"
            },
            {
                "internalType": "uint256",
                "name": "time",
                "type": "uint256"
            },
            {
                "internalType": "bool",
                "name": "canceled",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "bidsNum",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "",
                "type": "uint32"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [],
        "name": "renewContracts",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "initRuleBuyOut",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "coinsAmountNeeded",
                "type": "uint256"
            }
        ],
        "name": "initCoinsBuyOutForStabilization",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "initCoinsBuyOut",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "stateMutability": "payable",
        "type": "function",
        "payable": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            },
            {
                "internalType": "uint256",
                "name": "bidAmount",
                "type": "uint256"
            }
        ],
        "name": "makeBid",
        "outputs": [
            {
                "internalType": "uint32",
                "name": "bidID",
                "type": "uint32"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "bidID",
                "type": "uint32"
            },
            {
                "internalType": "uint256",
                "name": "newBidAmount",
                "type": "uint256"
            }
        ],
        "name": "improveBid",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "bidID",
                "type": "uint32"
            }
        ],
        "name": "cancelBid",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "name": "claimToFinalizeAuction",
        "outputs": [
            {
                "internalType": "bool",
                "name": "success",
                "type": "bool"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "name": "isFinalized",
        "outputs": [
            {
                "internalType": "bool",
                "name": "finalized",
                "type": "bool"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "name": "getPaymentAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    },
    {
        "inputs": [
            {
                "internalType": "uint32",
                "name": "auctionID",
                "type": "uint32"
            }
        ],
        "name": "getBestBidAmount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function",
        "constant": true
    }
];
config.poolABI = [{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Burn","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1","type":"uint256"}],"name":"Mint","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount0In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1In","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount0Out","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount1Out","type":"uint256"},{"indexed":true,"internalType":"address","name":"to","type":"address"}],"name":"Swap","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint112","name":"reserve0","type":"uint112"},{"indexed":false,"internalType":"uint112","name":"reserve1","type":"uint112"}],"name":"Sync","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"constant":true,"inputs":[],"name":"DOMAIN_SEPARATOR","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"MINIMUM_LIQUIDITY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"PERMIT_TYPEHASH","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"burn","outputs":[{"internalType":"uint256","name":"amount0","type":"uint256"},{"internalType":"uint256","name":"amount1","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"factory","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getReserves","outputs":[{"internalType":"uint112","name":"_reserve0","type":"uint112"},{"internalType":"uint112","name":"_reserve1","type":"uint112"},{"internalType":"uint32","name":"_blockTimestampLast","type":"uint32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"_token0","type":"address"},{"internalType":"address","name":"_token1","type":"address"}],"name":"initialize","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"kLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"mint","outputs":[{"internalType":"uint256","name":"liquidity","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"nonces","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint8","name":"v","type":"uint8"},{"internalType":"bytes32","name":"r","type":"bytes32"},{"internalType":"bytes32","name":"s","type":"bytes32"}],"name":"permit","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"price0CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"price1CumulativeLast","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"}],"name":"skim","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"amount0Out","type":"uint256"},{"internalType":"uint256","name":"amount1Out","type":"uint256"},{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"swap","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"sync","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"token0","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"token1","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"}];
config.stablePoolAddress = "0x718626E8c94DFdB24e7BD6d5F6da22035BCF47F7";

config.rpc = "https://holesky.rpc.rivet.cloud/6f4e0413c2dd468ebd08f54a5c9c5b82"
config.explorer = "https://holesky.etherscan.io/";

config.Balances = {
    title: 'Balances',
    plus: true,
    expander:true,
    add:'buyStable',
    subtitle: '',
    link:'/'
};

config.Commodities = {
    title: 'Commodities',
    plus: false,
    expander:true,

    subtitle: '',
    link:'/'
};
config.Contracts = {
    title: 'Contracts',
    plus: false,
    expander:true,
    subtitle: '',
}

config.Auctions = {
    title: 'Auctions',
    plus: true,
    expander:true,
    add:'initSomeAuction',
    subtitle: '',
}

config.Pools = {
    title: 'Pools',
    plus: false,
    expander:true,
    subtitle: '',
}

config.Deposits = {
    title: 'Deposits',
    plus: true,
    expander:true,
    add:'openDeposit',
    subtitle: '',
    page:'deposits'
}

config.Credits = {
    title: 'Loans',
    plus: true,
    expander:true,
    add:'Borrow',
    subtitle: '',
}

config.balances = [
    { title: 'ETH', name:'Ethereum', id: 1, iconType: 'wallet' },
    { title: 'DFC', name:'DotFlat coin', id: 2, iconType: 'wallet' },
    { title: 'RLE', name:'Rule token', id: 4, iconType: 'wallet' },
];

config.pools = [
    { title: 'TrueStableCoin', name:'DFC/ETC', id: 1, iconType: 'pool' },
    { title: 'Rule token swap', name:'RLE/DFC', id: 2, iconType: 'pool' },
    { title: 'Gold', name:'Gold/DFC', id: 3, iconType: 'pool' },
];

config.auctions = [
    { title: 'DFC buyout', name:'True stable coin', id: 1, iconType: 'auction' },
    { title: 'Rule buyout', name:'Rule tokens buyout', id: 2, iconType: 'auction' },
    { title: 'Liquidate collateral', name:'Liquidate collateral', id: 3, iconType: 'auction' },
];

config.contractsList = [
    { title: 'DFC', name:'Dotflat coin', id: 1, balance: '' , iconType: 'contract' },
    { title: 'CDP', name:'Collateral Dept Positions', id: 2, balance: '' , iconType: 'contract' },
    { title: 'Deposit', name:'Deposit', id: 3, balance: '' , iconType: 'contract' },
    { title: 'RLE', name:'Rule token', id: 4, balance: ''  , iconType: 'contract' },
    { title: 'Auction', name:'Auction', id: 5, balance: ''  , iconType: 'contract' },
    { title: 'INTDAO', name:'Interest DAO', id: 6, balance: ''  , iconType: 'contract' },
    { title: 'Basket', name:'Basket', id: 8, balance: ''  , iconType: 'contract' },
    { title: 'ExchangeRateContract', name:'ExchangeRateContract', id: 9, balance: ''  , iconType: 'contract' },
];

config.about = {
    subtitle: 'About DotFlat Coin',
    text: <div align="left">
        <p align="right"><em>&ldquo;Only&nbsp;when&nbsp;the&nbsp;last&nbsp;tree&nbsp;has&nbsp;died&nbsp;and&nbsp;the&nbsp;last&nbsp;river&nbsp;been&nbsp;poisoned&nbsp;and&nbsp;the&nbsp;last&nbsp;fish&nbsp;been caught will we realise we cannot eat money&rdquo; <br />&mdash; Cree Indian Proverb.</em></p>
            <h2>What is DotFlat?</h2>
            <p>DotFlat is a collateralized stablecoin with permanent purchasing power. &nbsp;</p>
            <h2>How can I use it?</h2>
            <p>You can use DotFlat to transfer value in Blockchain, protect your savings from inflation and earn interest.&nbsp;</p>
            <h2>Introduction</h2>
            <p>Originally, Blockchain was a way to avoid control on value transfers and possession, but native crypto, like Bitcoin and Ethereum are volatile. Today&rsquo;s stablecoins has several severe weak points: non-transparent collateral if any, ability to block your assets, inflation of indicative currency and tight interconnection with traditional financial system and banks. Sounds inconvenient if not frightening, isn&rsquo;t it?</p>
            <h2>How DFC works?</h2>
            <p>DotFlat is a fully collateralized and fully decentralized coin, which is pegged to commodities index with the help of cross-courses, so its value stays stable to an average commodity price, such as silver, gold, copper, orange juice, coffee, corn, wheat, cotton, rice, lumber, oil, gas, cattle and so on, let us say &ndash; a weighted cart of vital products.</p>
            <p>DotFlat (DFC) uses credit emission, so each coin is minted through a smart-contract (Collateral Debt Position or simply CDP) to a user, who provided sufficient collateral in native crypto, according to current commodities cart price and ETC/USD quotes. If price of ETC rises against commodities, each coin stays fully collateralized. If not, the system forces user to increase collateral and if it does not happen &ndash; sells the collateral through auction to cover emission, made by particular user.</p>
            <p>At the very start, the price of each DFC settled equal to US dollar, but as USD suffers inflation, which causes price growth of commodities, DFC saves purchasing power and grows against USD as an average commodity. From time to time, DFC can even be cheaper, that US Dollar, as commodities become cheaper. You can always check indicative price on this page.</p>
            <p>All of the terms are coded in the smart-contracts, so there is no organization or group of people, who can affect your balance. The only weak point for now is centralized commodities quotes translation to the blockchain, but we will make it decentralized in a year. For now, all quotes are parsed from https://www.investing.com/commodities/real-time-futures</p>
            <h2>Advantages</h2>
            <ul>
                <li><strong>Fully-collateralized</strong> &ndash; each coin minted is backed by crypto, placed on smart-contract&rsquo;s balance</li>
                <li><strong>Fully-decentralized</strong> &shy;&ndash; system is controlled by smart-contracts with open code</li>
                <li><strong>Totally transparent</strong> &ndash; all balances, terms, quotes, transactions and collaterals can be viewed on Blockchain</li>
                <li><strong>Not suffering inflation </strong>&ndash; so you can buy the same amount of pork in fifty ears, if you keep your value in DFC</li>
            </ul>
            <h2>System</h2>
            <p>In progress</p>
            <h2>Tokenomics</h2>
            <p>The main governance and profit receiving token is Rule token (RLE). Initial supply is 1&rsquo;000&rsquo;000 RLE.</p>
            <ul>
                <li>Pre-seed= 50&nbsp;000 RLE</li>
                <li>Advisers=50&nbsp;000 RLE</li>
                <li>Pre-sales= 240 000 RLE</li>
                <li>IDO= 360&nbsp;000 RLE</li>
                <li>Liquidity=100&nbsp;000 RLE</li>
                <li>DFC team = 200 000 RLE</li>
            </ul>
            <p>All profits for pre-seed and pre-sales round will go to development and marketing.</p>
            <p><strong>Meaning </strong><strong>of RLE</strong></p>
            <p>Rule is a governance and voting token of the DFC ecosystem. All crucial parameters of the system after initial setting may be changed through voting process. Each RLE counts as one vote.</p>
            <p><strong>Burning</strong></p>
            <p>True stable coin ecosystem has it&rsquo;s stability fund, placed on CDP contract address. You may always check its presence on the blockchain. Fund should be 5% from total emission of TSC. As the interest on credits or margin-call fee are paid, it comes directly to stability fund and as it overflows, automatic auction to buy back RLE can be initiated by any user. All RLE tokens, obtained by the system through buy-back auction are disposed. Thus, the price of RLE should go up.</p>
            <p><strong>Additional RLE emmision</strong></p>
            <p>If stability fund (DFC balance of CDP contract) is lack of DFC (less, than 5% of total supply), anyone can initiate auction to obtain DFC from market. Winner of this auction will be rewarded with additionally supplied RLE. So, RLE holders are not interested in additional emission and are likely to provide DFC themselves.</p>
            <h2>Conclusion</h2>
            <p>In progress.</p>
            <p>If you have any suggestions, you can contact me through e-mail <a href="mailto:nagor@academ.org">nagor@academ.org</a> or better loan some DFC (or buy them from pool with ETC) and buy RLE tokens from pool)</p>
            <p>All the smart-contracts&rsquo; code is verified, so you can check all the logic and realize, there is no trick.</p>
</div>
};

export default config;