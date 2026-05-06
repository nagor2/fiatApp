import React from "react";
import { Link } from "react-router-dom";


export const fromBlock = 21677704;//3182156;//18532910;//0;//17000000;

let config={};
config.localWeb3='';
config.daoAddress = '0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122';//'0x55Ead3b40016b1d5417F5A20F2d1E53e2d1c9122';
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
        "stateMutability": "payable",
        "type": "constructor",
        "payable": true
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
                "name": "newFlatCoinsAmount",
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
        "name": "address_this",
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
                "name": "flatCoinsToMint",
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
        "name": "getMaxFlatCoinsToMint",
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
        "name": "getMaxFlatCoinsToMintForPos",
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
                "name": "newFlatCoinsAmount",
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

// Публичный RPC используется как primary fallback когда нет MetaMask —
// publicnode отдаёт CORS-заголовки и работает прямо из браузера.
// Это важнее /api/rpc проксирования, т.к. в проде прокси/воркер могут быть 503,
// а publicnode не зависит от нашей инфраструктуры.
config.publicRpc = process.env.REACT_APP_PUBLIC_RPC_URL || 'https://ethereum-rpc.publicnode.com';

// Legacy: nginx proxy на RPC. Остаётся для совместимости (pool-liquidity-direct и т.п.),
// но НЕ используется как primary источник — см. Web3Context.initWeb3.
const defaultRpcUrl = "/api/rpc";
const rpcUrl = process.env.REACT_APP_RPC_URL || defaultRpcUrl;
config.rpc = rpcUrl.startsWith('http')
  ? rpcUrl
  : (typeof window !== 'undefined'
      ? `${window.location.origin}${rpcUrl}`
      : rpcUrl);

config.explorer = process.env.REACT_APP_EXPLORER_URL || "https://etherscan.io/";

config.Balances = {
    title: 'Balances',
    plus: true,
    expander:true,
    add:'buyStable',
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

config.Workers = {
    title: 'Workers',
    plus: false,
    expander:true,
    subtitle: '',
}

// По умолчанию используем nginx proxy /api/worker/ (тот же origin что и фронт).
// Это избавляет от CORS и от попыток стучаться в loopback клиента.
// В dev-режиме можно переопределить через REACT_APP_WORKERS_HEALTH_URL в .env.
const defaultWorkerHealthUrl = "/api/worker/health";
const rawWorkerHealthUrl = process.env.REACT_APP_WORKERS_HEALTH_URL || defaultWorkerHealthUrl;
const workerHealthUrl = rawWorkerHealthUrl.startsWith('http')
    ? rawWorkerHealthUrl
    : (typeof window !== 'undefined'
        ? `${window.location.origin}${rawWorkerHealthUrl}`
        : rawWorkerHealthUrl);

config.workers = [
    { 
        title: 'Block Watcher', 
        name: 'Monitors blockchain for cache invalidation', 
        id: 1, 
        iconType: 'robot',
        healthUrl: workerHealthUrl
    },
];

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
    { title: 'Dotflat/ETH swap', name:'DFC/ETH', id: 1, iconType: 'pool' },
    { title: 'Rule/Dotflat swap', name:'RLE/DFC', id: 2, iconType: 'pool' },
    { title: 'Gold', name:'Gold/DFC', id: 3, iconType: 'pool' },
];

config.auctions = [
    { title: 'DFC buyout', name:'DotFlatcoin', id: 1, iconType: 'auction' },
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
        <h1 style={{textAlign: 'center'}}>DotFlat</h1>
        <p align="right"><em>&ldquo;Only&nbsp;when&nbsp;the&nbsp;last&nbsp;tree&nbsp;has&nbsp;died&nbsp;and&nbsp;the&nbsp;last&nbsp;river&nbsp;been&nbsp;poisoned&nbsp;and&nbsp;the&nbsp;last&nbsp;fish&nbsp;been caught will we realise we cannot eat money&rdquo; <br />&mdash; Cree Indian Proverb.</em></p>

        <div style={{display: 'flex', gap: '24px', marginBottom: '8px', alignItems: 'flex-start'}}>
          <img
            src="/img/commodities-banner.jpg"
            alt="Commodities basket — gold, grain, oil, copper, coffee, cattle"
            style={{width: '35%', flexShrink: 0, height: 'auto', opacity: 0.55, borderRadius: '6px'}}
          />
          <div>
            <blockquote style={{borderLeft: '4px solid #e0a800', padding: '12px 20px', background: '#fffbea', margin: '0 0 16px 0'}}>
              <strong>Still holding USDT?</strong> The US dollar lost over 20% of its purchasing power from 2025 to 2026. USDT follows the dollar &mdash; so does your loss. DotFlat doesn&rsquo;t.
            </blockquote>
            <h2 style={{marginTop: 0}}>What is DotFlat?</h2>
            <p>DotFlat is a fully collateralized stablecoin with permanent purchasing power, running on Ethereum mainnet.</p>
            <h2>How can I use it?</h2>
            <p>You can use DotFlat to transfer value on the Blockchain, protect your savings from inflation, and earn interest.</p>
          </div>
        </div>

        <div style={{textAlign: 'center', margin: '28px 0'}}>
          <Link
            to="/contracts/ExchangeRateContract"
            style={{
              display: 'inline-block',
              padding: '14px 36px',
              background: 'linear-gradient(135deg, #e0a800 0%, #f5c518 100%)',
              color: '#1a1a1a',
              fontWeight: 800,
              fontSize: '1.1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              letterSpacing: '0.04em',
              boxShadow: '0 4px 16px rgba(224,168,0,0.55)',
              textShadow: 'none',
            }}
          >
            📊 What will $1,000 buy in 2030?
          </Link>
        </div>

        <div style={{background: '#f8f8f8', border: '1px solid #e8e8e8', borderRadius: '10px', padding: '24px 28px', margin: '8px 0 28px'}}>
          <h3 style={{marginTop: 0, fontSize: '1.1rem', letterSpacing: '0.02em'}}>
            DFC is a <em>flatcoin</em> &mdash; not a stablecoin
          </h3>
          <p style={{marginBottom: '20px', color: '#444'}}>
            Stablecoins track fiat money. Flatcoins track what money can actually buy.
            DFC is pegged to a basket of real-world commodities, so its value moves with the real economy &mdash; not with government printing presses.
          </p>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
            <div style={{background: '#fff3f3', borderRadius: '8px', padding: '16px 20px'}}>
              <div style={{fontWeight: 700, marginBottom: '10px', color: '#c0392b'}}>😟 USDT / USDC</div>
              <ul style={{margin: 0, paddingLeft: '18px', color: '#555', lineHeight: 1.7}}>
                <li>Pegged to the US dollar</li>
                <li>Loses purchasing power every year</li>
                <li>Controlled by a central company</li>
                <li>Can be frozen or blacklisted</li>
                <li>Dependent on the banking system</li>
              </ul>
            </div>
            <div style={{background: '#f0faf0', borderRadius: '8px', padding: '16px 20px'}}>
              <div style={{fontWeight: 700, marginBottom: '10px', color: '#27ae60'}}>😊 DotFlat (DFC)</div>
              <ul style={{margin: 0, paddingLeft: '18px', color: '#555', lineHeight: 1.7}}>
                <li>Pegged to a commodities basket</li>
                <li>Preserves purchasing power over time</li>
                <li>Governed by open smart contracts</li>
                <li>Nobody can freeze your balance</li>
                <li>Over-collateralized for stability</li>
              </ul>
            </div>
          </div>
        </div>

        <h2>DotFlat Explained</h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '8px 0 28px'}}>
          <div style={{background: '#fffbea', borderRadius: '8px', padding: '20px', borderTop: '3px solid #e0a800'}}>
            <div style={{fontSize: '1.6rem', marginBottom: '8px'}}>🏦</div>
            <strong>Fully Collateralized</strong>
            <p style={{marginTop: '8px', marginBottom: 0, color: '#555', fontSize: '0.92rem', lineHeight: 1.6}}>Every DFC in circulation is backed by ETH locked in a smart contract. No fractional reserves, no hidden risk.</p>
          </div>
          <div style={{background: '#fffbea', borderRadius: '8px', padding: '20px', borderTop: '3px solid #e0a800'}}>
            <div style={{fontSize: '1.6rem', marginBottom: '8px'}}>🛒</div>
            <strong>Tracks Real Goods</strong>
            <p style={{marginTop: '8px', marginBottom: 0, color: '#555', fontSize: '0.92rem', lineHeight: 1.6}}>Value is tied to a basket of commodities &mdash; gold, oil, grain, coffee &mdash; so DFC buys roughly the same amount of real-world goods year after year.</p>
          </div>
          <div style={{background: '#fffbea', borderRadius: '8px', padding: '20px', borderTop: '3px solid #e0a800'}}>
            <div style={{fontSize: '1.6rem', marginBottom: '8px'}}>🔒</div>
            <strong>Non-Custodial</strong>
            <p style={{marginTop: '8px', marginBottom: 0, color: '#555', fontSize: '0.92rem', lineHeight: 1.6}}>All logic lives in verified Ethereum smart contracts. No company holds your assets. No one can freeze, censor, or confiscate your balance.</p>
          </div>
        </div>

        <h2>Introduction</h2>
        <p>Originally, Blockchain was a way to avoid control over value transfers and possession, but native crypto like Bitcoin and Ethereum is volatile. Today&rsquo;s stablecoins have several severe weak points: non-transparent collateral if any, ability to block your assets, inflation of the indicative currency, and tight interconnection with the traditional financial system and banks. Sounds inconvenient, doesn&rsquo;t it?</p>
        <h2>How DFC works?</h2>
        <p>DotFlat is a fully collateralized and fully decentralized coin, pegged to a commodities index using cross-rates, so its value stays stable relative to average commodity prices &mdash; silver, gold, copper, orange juice, coffee, corn, wheat, cotton, rice, lumber, oil, gas, cattle, and so on. Think of it as a weighted basket of vital goods.</p>
        <p>DotFlat (DFC) uses credit emission: each coin is minted through a smart contract (Collateral Debt Position, or CDP) to a user who has provided sufficient collateral in ETH, according to the current commodities basket price and ETH/USD quotes. If the price of ETH rises against commodities, each coin stays fully collateralized. If not, the system requires the user to increase their collateral &mdash; and if that doesn&rsquo;t happen, sells the collateral through an auction to cover the emission made by that user.</p>
        <p>At launch, the price of each DFC was set equal to one US dollar. But as USD suffers inflation &mdash; which drives up the price of commodities &mdash; DFC preserves purchasing power and appreciates against USD alongside an average commodity. From time to time DFC may even be cheaper than a US dollar, when commodity prices fall. You can always check the indicative price on this page.</p>
        <h2>Does it matter if DFC falls in dollar terms?</h2>
        <p>No &mdash; and that is the point. If DFC drops against the dollar, it simply means commodities got cheaper. You can still buy the same basket of goods with your DFC as you could before. The absolute dollar price is irrelevant; what matters is what you can actually purchase. A dollar that silently loses 4% a year looks stable on the screen while your savings quietly erode. DFC doesn&rsquo;t pretend &mdash; it tracks reality.</p>
        <h2>Advantages</h2>
        <ul>
            <li><strong>Fully collateralized</strong> &ndash; each coin minted is backed by ETH placed on the smart contract&rsquo;s balance</li>
            <li><strong>Fully decentralized</strong> &ndash; the system is controlled by smart contracts with open, verified code</li>
            <li><strong>Totally transparent</strong> &ndash; all balances, terms, quotes, transactions and collaterals can be viewed on the Blockchain</li>
            <li><strong>Inflation-proof</strong> &ndash; you can buy the same amount of goods in fifty years if you keep your value in DFC</li>
            <li><strong>Uncensorable</strong> &ndash; no organization or group of people can freeze or affect your balance</li>
        </ul>
        <h2>Tokenomics</h2>
        <p>The main governance and profit-receiving token is the Rule token (RLE). Initial supply is 1&rsquo;000&rsquo;000 RLE.</p>
        <ul>
            <li>Pre-seed &mdash; 50&nbsp;000 RLE</li>
            <li>Advisers &mdash; 50&nbsp;000 RLE</li>
            <li>Pre-sales &mdash; 240&nbsp;000 RLE</li>
            <li>IDO &mdash; 360&nbsp;000 RLE</li>
            <li>Liquidity &mdash; 100&nbsp;000 RLE</li>
            <li>DFC team &mdash; 200&nbsp;000 RLE</li>
        </ul>
        <p>All profits from the pre-seed and pre-sales rounds go to development and marketing.</p>
        <p><strong>Meaning of RLE</strong></p>
        <p>Rule is the governance and voting token of the DFC ecosystem. All crucial parameters of the system may be changed after launch through a voting process. Each RLE counts as one vote.</p>
        <p><strong>Burning</strong></p>
        <p>The DotFlat ecosystem maintains a stability fund held at the CDP contract address &mdash; you can always verify its balance on the Blockchain. The fund must equal 5% of total DFC emission. As interest on credits or margin-call fees are paid, they go directly into the stability fund. When the fund overflows, any user can trigger an automatic auction to buy back RLE. All RLE obtained through buy-back auctions is burned, exerting upward pressure on the RLE price.</p>
        <p><strong>Additional RLE emission</strong></p>
        <p>If the stability fund falls below 5% of total supply, anyone can initiate an auction to source DFC from the market. The auction winner is rewarded with newly issued RLE. This means RLE holders are incentivized to supply DFC themselves rather than allow additional emission.</p>
        <h2>Conclusion</h2>
        <p>DotFlat is an attempt to build money that works the way money should: stable in terms of what it can buy, not in terms of a government-issued unit that inflates away. All smart contract code is verified &mdash; you can read every line of logic and confirm there is no trick.</p>
        <p>The only current weak point is centralized commodity quotes delivery to the Blockchain. All quotes are sourced from <a href="https://www.investing.com/commodities/real-time-futures" target="_blank">investing.com</a>. Decentralization of the oracle is on the roadmap.</p>
        <p>If you have suggestions, reach out at <a href="mailto:nagor@academ.org">nagor@academ.org</a>, or better yet &mdash; open a CDP, mint some DFC, and join the ecosystem.</p>
        <p>&nbsp;</p>
    </div>
};

config.workersHealthUrl = workerHealthUrl;

config.etherscanApiKey = process.env.REACT_APP_ETHERSCAN_API_KEY || '';
config.etherscanApiUrl = 'https://api.etherscan.io/v2/api';

export default config;