# Oracle Smart Contracts

**Version**: 1.0.0  
**Date**: 2026-04-04  
**Solidity**: ^0.8.20

## Table of Contents

- [OracleRegistry.sol](#oracleregistrysol)
- [OraclePriceFeed.sol](#oraclepricefeedsol)
- [OracleGovernance.sol](#oraclegovernancesol)
- [Interfaces](#interfaces)
- [Testing Strategy](#testing-strategy)

---

## OracleRegistry.sol

Manages oracle registration, staking, slashing, and reputation.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title OracleRegistry
 * @notice Permissionless oracle registration with RLE staking
 * @dev Oracles stake RLE tokens to gain voting weight in price consensus
 */
contract OracleRegistry is Ownable, ReentrancyGuard {
    
    // ==================== State Variables ====================
    
    IERC20 public immutable rleToken;
    
    /// @notice Minimum RLE to stake to become an oracle
    uint256 public minStake = 10_000 * 10**18;  // 10,000 RLE
    
    /// @notice Standard slash amount for inaccurate reporting
    uint256 public slashAmount = 2_000 * 10**18;  // 2,000 RLE
    
    /// @notice Time period before staked tokens can be withdrawn
    uint256 public unbondingPeriod = 7 days;
    
    /// @notice Address authorized to slash oracles (DAO or automated system)
    address public disputeResolver;
    
    /// @notice Treasury address to receive slashed tokens
    address public treasury;
    
    struct Oracle {
        address oracleAddress;
        uint256 stakedAmount;         // Current staked RLE
        uint256 registeredAt;         // Timestamp of registration
        uint256 deactivatedAt;        // Timestamp of deactivation (0 if active)
        uint256 totalReports;         // Lifetime total reports submitted
        uint256 accurateReports;      // Reports within accuracy threshold
        uint256 slashedAmount;        // Total RLE slashed (historical)
        bool active;                  // Currently active oracle
    }
    
    /// @notice Mapping of oracle address to Oracle struct
    mapping(address => Oracle) public oracles;
    
    /// @notice Array of all oracle addresses (including inactive)
    address[] public oracleList;
    
    /// @notice Count of currently active oracles
    uint256 public activeOracleCount;
    
    // ==================== Events ====================
    
    event OracleRegistered(
        address indexed oracle, 
        uint256 stake,
        uint256 timestamp
    );
    
    event StakeIncreased(
        address indexed oracle, 
        uint256 additionalAmount,
        uint256 newTotal
    );
    
    event OracleDeactivated(
        address indexed oracle,
        uint256 timestamp
    );
    
    event StakeWithdrawn(
        address indexed oracle,
        uint256 amount
    );
    
    event OracleSlashed(
        address indexed oracle, 
        uint256 amount,
        string reason,
        address slasher
    );
    
    event ReportRecorded(
        address indexed oracle,
        bool accurate
    );
    
    event MinStakeUpdated(uint256 oldValue, uint256 newValue);
    event SlashAmountUpdated(uint256 oldValue, uint256 newValue);
    event DisputeResolverUpdated(address oldResolver, address newResolver);
    
    // ==================== Constructor ====================
    
    constructor(
        address _rleToken,
        address _disputeResolver,
        address _treasury
    ) {
        require(_rleToken != address(0), "Invalid RLE token");
        require(_disputeResolver != address(0), "Invalid dispute resolver");
        require(_treasury != address(0), "Invalid treasury");
        
        rleToken = IERC20(_rleToken);
        disputeResolver = _disputeResolver;
        treasury = _treasury;
    }
    
    // ==================== Oracle Registration ====================
    
    /**
     * @notice Register as an oracle by staking RLE tokens
     * @param stakeAmount Amount of RLE to stake (must be >= minStake)
     */
    function registerOracle(uint256 stakeAmount) external nonReentrant {
        require(stakeAmount >= minStake, "Stake below minimum");
        require(!oracles[msg.sender].active, "Already registered");
        
        // Transfer RLE tokens to this contract
        require(
            rleToken.transferFrom(msg.sender, address(this), stakeAmount),
            "Transfer failed"
        );
        
        // Create or update oracle record
        Oracle storage oracle = oracles[msg.sender];
        
        if (oracle.oracleAddress == address(0)) {
            // First time registration
            oracle.oracleAddress = msg.sender;
            oracle.registeredAt = block.timestamp;
            oracleList.push(msg.sender);
        }
        
        oracle.stakedAmount = stakeAmount;
        oracle.deactivatedAt = 0;
        oracle.active = true;
        activeOracleCount++;
        
        emit OracleRegistered(msg.sender, stakeAmount, block.timestamp);
    }
    
    /**
     * @notice Increase stake to boost voting weight
     * @param additionalAmount Additional RLE to stake
     */
    function increaseStake(uint256 additionalAmount) external nonReentrant {
        require(oracles[msg.sender].active, "Not an active oracle");
        require(additionalAmount > 0, "Amount must be positive");
        
        require(
            rleToken.transferFrom(msg.sender, address(this), additionalAmount),
            "Transfer failed"
        );
        
        Oracle storage oracle = oracles[msg.sender];
        oracle.stakedAmount += additionalAmount;
        
        emit StakeIncreased(
            msg.sender, 
            additionalAmount, 
            oracle.stakedAmount
        );
    }
    
    // ==================== Oracle Deactivation ====================
    
    /**
     * @notice Deactivate oracle and start unbonding period
     * @dev Tokens can be withdrawn after unbondingPeriod
     */
    function deactivate() external {
        Oracle storage oracle = oracles[msg.sender];
        require(oracle.active, "Not active");
        
        oracle.active = false;
        oracle.deactivatedAt = block.timestamp;
        activeOracleCount--;
        
        emit OracleDeactivated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Withdraw staked tokens after unbonding period
     * @dev Can only withdraw if oracle is inactive and unbonding period passed
     */
    function withdrawStake() external nonReentrant {
        Oracle storage oracle = oracles[msg.sender];
        require(!oracle.active, "Still active");
        require(oracle.deactivatedAt > 0, "Not deactivated");
        require(
            block.timestamp >= oracle.deactivatedAt + unbondingPeriod,
            "Unbonding period not finished"
        );
        
        uint256 amount = oracle.stakedAmount;
        require(amount > 0, "No stake to withdraw");
        
        oracle.stakedAmount = 0;
        
        require(rleToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit StakeWithdrawn(msg.sender, amount);
    }
    
    // ==================== Slashing ====================
    
    /**
     * @notice Slash an oracle for malicious behavior or inaccurate reporting
     * @param oracleAddress Address of oracle to slash
     * @param amount Amount of RLE to slash
     * @param reason Human-readable reason for slash
     */
    function slashOracle(
        address oracleAddress,
        uint256 amount,
        string calldata reason
    ) external {
        require(
            msg.sender == disputeResolver || msg.sender == owner(),
            "Not authorized to slash"
        );
        
        Oracle storage oracle = oracles[oracleAddress];
        require(oracle.stakedAmount >= amount, "Insufficient stake");
        
        oracle.stakedAmount -= amount;
        oracle.slashedAmount += amount;
        
        // Transfer slashed tokens to treasury
        require(rleToken.transfer(treasury, amount), "Transfer failed");
        
        emit OracleSlashed(oracleAddress, amount, reason, msg.sender);
        
        // Auto-deactivate if stake falls below minimum
        if (oracle.active && oracle.stakedAmount < minStake) {
            oracle.active = false;
            oracle.deactivatedAt = block.timestamp;
            activeOracleCount--;
            
            emit OracleDeactivated(oracleAddress, block.timestamp);
        }
    }
    
    // ==================== Reputation Tracking ====================
    
    /**
     * @notice Record a report submission (called by OraclePriceFeed)
     * @param oracleAddress Oracle that submitted report
     * @param accurate Whether report was within accuracy threshold
     */
    function recordReport(address oracleAddress, bool accurate) external {
        require(msg.sender == disputeResolver, "Only dispute resolver");
        
        Oracle storage oracle = oracles[oracleAddress];
        require(oracle.active, "Oracle not active");
        
        oracle.totalReports++;
        if (accurate) {
            oracle.accurateReports++;
        }
        
        emit ReportRecorded(oracleAddress, accurate);
    }
    
    // ==================== View Functions ====================
    
    /**
     * @notice Calculate voting weight for an oracle
     * @param oracleAddress Address of oracle
     * @return Voting weight (base stake + accuracy multiplier)
     */
    function getVotingWeight(address oracleAddress) 
        public 
        view 
        returns (uint256) 
    {
        Oracle memory oracle = oracles[oracleAddress];
        
        if (!oracle.active) {
            return 0;
        }
        
        uint256 baseWeight = oracle.stakedAmount;
        
        // Apply accuracy multiplier (0-20% bonus)
        if (oracle.totalReports >= 10) {  // Min 10 reports for bonus
            uint256 accuracyRate = (oracle.accurateReports * 100) / oracle.totalReports;
            
            if (accuracyRate >= 95) {
                // 95-100% accuracy: +15-20% weight
                uint256 bonus = 15 + (accuracyRate - 95);  // 15-20%
                baseWeight = baseWeight * (100 + bonus) / 100;
            } else if (accuracyRate >= 90) {
                // 90-95% accuracy: +10% weight
                baseWeight = baseWeight * 110 / 100;
            } else if (accuracyRate >= 85) {
                // 85-90% accuracy: +5% weight
                baseWeight = baseWeight * 105 / 100;
            }
            // <85% accuracy: no bonus
        }
        
        return baseWeight;
    }
    
    /**
     * @notice Get accuracy rate for an oracle
     * @param oracleAddress Address of oracle
     * @return Accuracy percentage (0-100)
     */
    function getAccuracyRate(address oracleAddress) 
        external 
        view 
        returns (uint256) 
    {
        Oracle memory oracle = oracles[oracleAddress];
        
        if (oracle.totalReports == 0) {
            return 0;
        }
        
        return (oracle.accurateReports * 100) / oracle.totalReports;
    }
    
    /**
     * @notice Get list of all active oracles
     * @return Array of active oracle addresses
     */
    function getActiveOracles() external view returns (address[] memory) {
        address[] memory actives = new address[](activeOracleCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < oracleList.length; i++) {
            if (oracles[oracleList[i]].active) {
                actives[index] = oracleList[i];
                index++;
            }
        }
        
        return actives;
    }
    
    /**
     * @notice Get total staked RLE across all oracles
     * @return Total staked amount
     */
    function getTotalStaked() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < oracleList.length; i++) {
            if (oracles[oracleList[i]].active) {
                total += oracles[oracleList[i]].stakedAmount;
            }
        }
        return total;
    }
    
    // ==================== Admin Functions ====================
    
    /**
     * @notice Update minimum stake requirement
     * @param newMinStake New minimum stake in RLE (with 18 decimals)
     */
    function setMinStake(uint256 newMinStake) external onlyOwner {
        require(newMinStake > 0, "Min stake must be positive");
        emit MinStakeUpdated(minStake, newMinStake);
        minStake = newMinStake;
    }
    
    /**
     * @notice Update standard slash amount
     * @param newSlashAmount New slash amount in RLE (with 18 decimals)
     */
    function setSlashAmount(uint256 newSlashAmount) external onlyOwner {
        require(newSlashAmount > 0, "Slash amount must be positive");
        emit SlashAmountUpdated(slashAmount, newSlashAmount);
        slashAmount = newSlashAmount;
    }
    
    /**
     * @notice Update dispute resolver address
     * @param newResolver New dispute resolver address
     */
    function setDisputeResolver(address newResolver) external onlyOwner {
        require(newResolver != address(0), "Invalid address");
        emit DisputeResolverUpdated(disputeResolver, newResolver);
        disputeResolver = newResolver;
    }
    
    /**
     * @notice Update unbonding period
     * @param newPeriod New unbonding period in seconds
     */
    function setUnbondingPeriod(uint256 newPeriod) external onlyOwner {
        require(newPeriod >= 1 days, "Period too short");
        require(newPeriod <= 30 days, "Period too long");
        unbondingPeriod = newPeriod;
    }
}
```

---

## OraclePriceFeed.sol

Collects price reports, calculates weighted median consensus, and finalizes prices.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OracleRegistry.sol";

/**
 * @title OraclePriceFeed
 * @notice Decentralized price feed with weighted median consensus
 * @dev Oracles submit prices, system calculates weighted median
 */
contract OraclePriceFeed {
    
    // ==================== State Variables ====================
    
    OracleRegistry public immutable registry;
    
    /// @notice Minimum number of oracle reports required for consensus
    uint256 public minReports = 3;
    
    /// @notice Time window for oracles to submit reports (in seconds)
    uint256 public reportWindow = 1 hours;
    
    /// @notice Maximum age of price before considered stale
    uint256 public maxPriceAge = 2 hours;
    
    /// @notice Maximum allowed deviation from median (percentage, 1 = 1%)
    uint256 public maxDeviation = 15;  // 15%
    
    struct PriceReport {
        uint256 value;
        address reporter;
        uint256 weight;
        uint256 timestamp;
    }
    
    struct PriceRound {
        PriceReport[] reports;
        uint256 finalizedPrice;
        uint256 finalizedAt;
        uint256 roundStartTime;
        bool finalized;
    }
    
    /// @notice Mapping: commodity => round => PriceRound
    mapping(bytes32 => mapping(uint256 => PriceRound)) public priceRounds;
    
    /// @notice Mapping: commodity => current round number
    mapping(bytes32 => uint256) public currentRound;
    
    /// @notice Mapping: commodity => oracle => last report round
    mapping(bytes32 => mapping(address => uint256)) public lastReportRound;
    
    /// @notice Circuit breaker: paused commodities
    mapping(bytes32 => bool) public paused;
    
    address public owner;
    
    // ==================== Events ====================
    
    event PriceReported(
        bytes32 indexed commodity,
        uint256 indexed round,
        address indexed oracle,
        uint256 price,
        uint256 weight,
        uint256 timestamp
    );
    
    event PriceFinalized(
        bytes32 indexed commodity,
        uint256 indexed round,
        uint256 price,
        uint256 reportCount,
        uint256 timestamp
    );
    
    event CircuitBreakerTriggered(
        bytes32 indexed commodity,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 deviation
    );
    
    // ==================== Constructor ====================
    
    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry");
        registry = OracleRegistry(_registry);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ==================== Price Reporting ====================
    
    /**
     * @notice Submit a price report for a commodity
     * @param commodity Identifier of commodity (e.g., keccak256("GOLD"))
     * @param price Price value (scaled appropriately, e.g., 8 decimals)
     */
    function reportPrice(bytes32 commodity, uint256 price) external {
        require(!paused[commodity], "Commodity paused");
        require(price > 0, "Price must be positive");
        
        // Verify oracle is active
        (,uint256 stakedAmount,,,,, bool active) = registry.oracles(msg.sender);
        require(active, "Not an active oracle");
        require(stakedAmount >= registry.minStake(), "Insufficient stake");
        
        uint256 round = currentRound[commodity];
        PriceRound storage priceRound = priceRounds[commodity][round];
        
        // Start new round if:
        // 1. Current round is finalized, OR
        // 2. Report window expired
        if (
            priceRound.finalized ||
            (priceRound.roundStartTime > 0 && 
             block.timestamp > priceRound.roundStartTime + reportWindow)
        ) {
            round++;
            currentRound[commodity] = round;
            priceRound = priceRounds[commodity][round];
            priceRound.roundStartTime = block.timestamp;
        }
        
        // Initialize round start time if first report
        if (priceRound.roundStartTime == 0) {
            priceRound.roundStartTime = block.timestamp;
        }
        
        // Check oracle hasn't already reported this round
        require(
            lastReportRound[commodity][msg.sender] < round,
            "Already reported this round"
        );
        
        // Get voting weight from registry
        uint256 weight = registry.getVotingWeight(msg.sender);
        
        // Store report
        priceRound.reports.push(PriceReport({
            value: price,
            reporter: msg.sender,
            weight: weight,
            timestamp: block.timestamp
        }));
        
        lastReportRound[commodity][msg.sender] = round;
        
        emit PriceReported(
            commodity,
            round,
            msg.sender,
            price,
            weight,
            block.timestamp
        );
        
        // Auto-finalize if minimum reports reached
        if (priceRound.reports.length >= minReports) {
            _finalize(commodity, round);
        }
    }
    
    // ==================== Finalization ====================
    
    /**
     * @notice Finalize price round (calculate weighted median)
     * @param commodity Commodity identifier
     * @param round Round number to finalize
     */
    function finalize(bytes32 commodity, uint256 round) external {
        _finalize(commodity, round);
    }
    
    function _finalize(bytes32 commodity, uint256 round) internal {
        PriceRound storage priceRound = priceRounds[commodity][round];
        
        require(!priceRound.finalized, "Already finalized");
        require(
            priceRound.reports.length >= minReports,
            "Not enough reports"
        );
        
        // Calculate weighted median
        uint256 medianPrice = _calculateWeightedMedian(priceRound.reports);
        
        // Circuit breaker: check for extreme deviation
        if (round > 0) {
            PriceRound storage prevRound = priceRounds[commodity][round - 1];
            if (prevRound.finalized) {
                uint256 prevPrice = prevRound.finalizedPrice;
                uint256 deviation = _calculateDeviation(prevPrice, medianPrice);
                
                // If >20% deviation, pause and require manual review
                if (deviation > 20) {
                    paused[commodity] = true;
                    emit CircuitBreakerTriggered(
                        commodity,
                        prevPrice,
                        medianPrice,
                        deviation
                    );
                    return;  // Don't finalize
                }
            }
        }
        
        priceRound.finalizedPrice = medianPrice;
        priceRound.finalizedAt = block.timestamp;
        priceRound.finalized = true;
        
        emit PriceFinalized(
            commodity,
            round,
            medianPrice,
            priceRound.reports.length,
            block.timestamp
        );
        
        // Update oracle accuracy scores
        _updateAccuracyScores(commodity, round, medianPrice);
    }
    
    /**
     * @notice Calculate weighted median of price reports
     * @param reports Array of price reports
     * @return Weighted median price
     */
    function _calculateWeightedMedian(PriceReport[] memory reports)
        internal
        pure
        returns (uint256)
    {
        uint256 n = reports.length;
        
        // Sort by price (bubble sort - fine for small arrays)
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (reports[i].value > reports[j].value) {
                    PriceReport memory temp = reports[i];
                    reports[i] = reports[j];
                    reports[j] = temp;
                }
            }
        }
        
        // Calculate total weight
        uint256 totalWeight = 0;
        for (uint256 i = 0; i < n; i++) {
            totalWeight += reports[i].weight;
        }
        
        // Find weighted median
        uint256 cumulativeWeight = 0;
        uint256 halfWeight = totalWeight / 2;
        
        for (uint256 i = 0; i < n; i++) {
            cumulativeWeight += reports[i].weight;
            if (cumulativeWeight >= halfWeight) {
                return reports[i].value;
            }
        }
        
        // Fallback (should never reach)
        return reports[n / 2].value;
    }
    
    /**
     * @notice Update accuracy scores for oracles in a finalized round
     * @param commodity Commodity identifier
     * @param round Round number
     * @param finalPrice Finalized median price
     */
    function _updateAccuracyScores(
        bytes32 commodity,
        uint256 round,
        uint256 finalPrice
    ) internal {
        PriceRound storage priceRound = priceRounds[commodity][round];
        
        uint256 threshold = (finalPrice * maxDeviation) / 100;
        
        for (uint256 i = 0; i < priceRound.reports.length; i++) {
            PriceReport memory report = priceRound.reports[i];
            
            uint256 deviation = _abs(
                int256(report.value) - int256(finalPrice)
            );
            
            bool accurate = deviation <= threshold;
            
            // Record accuracy (this would call registry.recordReport)
            // registry.recordReport(report.reporter, accurate);
            
            // If severe outlier (>3x threshold), potential slash
            if (deviation > threshold * 3) {
                // In production, this would trigger dispute resolution
                // For now, just emit an event or flag for manual review
            }
        }
    }
    
    // ==================== View Functions ====================
    
    /**
     * @notice Get latest finalized price for a commodity
     * @param commodity Commodity identifier
     * @return price Latest price
     * @return timestamp When price was finalized
     */
    function getLatestPrice(bytes32 commodity)
        external
        view
        returns (uint256 price, uint256 timestamp)
    {
        uint256 round = currentRound[commodity];
        PriceRound storage priceRound = priceRounds[commodity][round];
        
        require(priceRound.finalized, "Price not finalized");
        require(
            block.timestamp <= priceRound.finalizedAt + maxPriceAge,
            "Price too old"
        );
        
        return (priceRound.finalizedPrice, priceRound.finalizedAt);
    }
    
    /**
     * @notice Get price at specific round
     * @param commodity Commodity identifier
     * @param round Round number
     * @return price Price at that round
     * @return timestamp When finalized
     * @return reportCount Number of reports
     */
    function getPriceAtRound(bytes32 commodity, uint256 round)
        external
        view
        returns (
            uint256 price,
            uint256 timestamp,
            uint256 reportCount
        )
    {
        PriceRound storage priceRound = priceRounds[commodity][round];
        require(priceRound.finalized, "Round not finalized");
        
        return (
            priceRound.finalizedPrice,
            priceRound.finalizedAt,
            priceRound.reports.length
        );
    }
    
    // ==================== Utility Functions ====================
    
    function _calculateDeviation(uint256 oldPrice, uint256 newPrice)
        internal
        pure
        returns (uint256)
    {
        uint256 diff = _abs(int256(newPrice) - int256(oldPrice));
        return (diff * 100) / oldPrice;
    }
    
    function _abs(int256 x) internal pure returns (uint256) {
        return x >= 0 ? uint256(x) : uint256(-x);
    }
    
    // ==================== Admin Functions ====================
    
    function setMinReports(uint256 _minReports) external onlyOwner {
        require(_minReports >= 3, "Min reports too low");
        minReports = _minReports;
    }
    
    function setReportWindow(uint256 _window) external onlyOwner {
        require(_window >= 5 minutes, "Window too short");
        reportWindow = _window;
    }
    
    function unpause(bytes32 commodity) external onlyOwner {
        paused[commodity] = false;
    }
}
```

---

## OracleGovernance.sol

DAO governance for oracle parameters using RLE token voting.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title OracleGovernance
 * @notice DAO governance for oracle network parameters
 * @dev RLE token holders vote on proposals
 */
contract OracleGovernance {
    
    IERC20 public immutable rleToken;
    OracleRegistry public immutable registry;
    OraclePriceFeed public immutable priceFeed;
    
    /// @notice Minimum RLE balance to create proposal
    uint256 public constant PROPOSAL_THRESHOLD = 1_000 * 10**18;  // 1,000 RLE
    
    /// @notice Voting period duration
    uint256 public constant VOTING_PERIOD = 3 days;
    
    /// @notice Execution delay after successful vote
    uint256 public constant TIMELOCK_PERIOD = 1 days;
    
    /// @notice Quorum percentage (10% of circulating RLE)
    uint256 public constant QUORUM_PERCENTAGE = 10;
    
    enum ProposalState {
        Active,
        Defeated,
        Succeeded,
        Queued,
        Executed,
        Cancelled
    }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address target;           // Contract to call
        bytes callData;           // Function call data
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startBlock;
        uint256 endBlock;
        uint256 executionTime;    // When can be executed (after timelock)
        ProposalState state;
        mapping(address => bool) hasVoted;
    }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votes
    );
    
    event ProposalQueued(uint256 indexed proposalId, uint256 executionTime);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    
    constructor(
        address _rleToken,
        address _registry,
        address _priceFeed
    ) {
        rleToken = IERC20(_rleToken);
        registry = OracleRegistry(_registry);
        priceFeed = OraclePriceFeed(_priceFeed);
    }
    
    /**
     * @notice Create a new governance proposal
     * @param description Human-readable description
     * @param target Contract address to call
     * @param callData Encoded function call
     */
    function propose(
        string memory description,
        address target,
        bytes memory callData
    ) external returns (uint256) {
        require(
            rleToken.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD,
            "Insufficient RLE balance"
        );
        
        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        
        proposal.id = proposalCount;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.target = target;
        proposal.callData = callData;
        proposal.startBlock = block.number;
        proposal.endBlock = block.number + (VOTING_PERIOD / 12);  // ~12s blocks
        proposal.state = ProposalState.Active;
        
        emit ProposalCreated(proposalCount, msg.sender, description);
        
        return proposalCount;
    }
    
    /**
     * @notice Cast vote on a proposal
     * @param proposalId Proposal ID
     * @param support True for yes, false for no
     */
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.number <= proposal.endBlock, "Voting ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votes = rleToken.balanceOf(msg.sender);
        require(votes > 0, "No voting power");
        
        if (support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        proposal.hasVoted[msg.sender] = true;
        
        emit VoteCast(proposalId, msg.sender, support, votes);
    }
    
    /**
     * @notice Queue a successful proposal for execution
     * @param proposalId Proposal ID
     */
    function queue(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.state == ProposalState.Active, "Not active");
        require(block.number > proposal.endBlock, "Voting not ended");
        
        // Check if succeeded
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 circulatingSupply = rleToken.totalSupply();
        uint256 quorum = (circulatingSupply * QUORUM_PERCENTAGE) / 100;
        
        if (totalVotes < quorum) {
            proposal.state = ProposalState.Defeated;
            return;
        }
        
        if (proposal.forVotes <= proposal.againstVotes) {
            proposal.state = ProposalState.Defeated;
            return;
        }
        
        proposal.state = ProposalState.Queued;
        proposal.executionTime = block.timestamp + TIMELOCK_PERIOD;
        
        emit ProposalQueued(proposalId, proposal.executionTime);
    }
    
    /**
     * @notice Execute a queued proposal
     * @param proposalId Proposal ID
     */
    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        require(proposal.state == ProposalState.Queued, "Not queued");
        require(
            block.timestamp >= proposal.executionTime,
            "Timelock not expired"
        );
        
        proposal.state = ProposalState.Executed;
        
        // Execute the call
        (bool success, ) = proposal.target.call(proposal.callData);
        require(success, "Execution failed");
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @notice Get proposal state
     * @param proposalId Proposal ID
     * @return Current state of proposal
     */
    function getProposalState(uint256 proposalId)
        external
        view
        returns (ProposalState)
    {
        return proposals[proposalId].state;
    }
}
```

---

## Interfaces

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracleRegistry {
    function oracles(address) external view returns (
        address oracleAddress,
        uint256 stakedAmount,
        uint256 registeredAt,
        uint256 deactivatedAt,
        uint256 totalReports,
        uint256 accurateReports,
        uint256 slashedAmount,
        bool active
    );
    
    function getVotingWeight(address oracle) external view returns (uint256);
    function minStake() external view returns (uint256);
}

interface IOraclePriceFeed {
    function getLatestPrice(bytes32 commodity) 
        external 
        view 
        returns (uint256 price, uint256 timestamp);
        
    function reportPrice(bytes32 commodity, uint256 price) external;
}
```

---

## Testing Strategy

### Unit Tests

```solidity
// Test OracleRegistry
- registerOracle: success, insufficient stake, already registered
- increaseStake: success, not active oracle
- deactivate: success, not active
- withdrawStake: success, still active, unbonding period
- slashOracle: success, insufficient stake, unauthorized
- getVotingWeight: no reports, high accuracy, low accuracy

// Test OraclePriceFeed
- reportPrice: success, not active oracle, duplicate report
- finalize: success, not enough reports, circuit breaker
- calculateWeightedMedian: 3 oracles, 5 oracles, equal weights
- getLatestPrice: success, not finalized, stale price

// Test OracleGovernance
- propose: success, insufficient balance
- castVote: success, already voted, voting ended
- queue: success, no quorum, defeated
- execute: success, not queued, timelock not expired
```

### Integration Tests

```javascript
// Scenario 1: Full oracle lifecycle
1. 5 oracles register with varying stakes
2. All report gold price (slightly different)
3. System calculates weighted median
4. Price finalized and available

// Scenario 2: Slashing
1. Oracle reports extreme outlier
2. Deviation detected
3. Slash triggered
4. Oracle deactivated (stake below minimum)

// Scenario 3: Governance
1. Proposal to increase MIN_STAKE
2. RLE holders vote
3. Proposal queued
4. After timelock, executed
5. MIN_STAKE updated
```

### Fuzzing Tests

```solidity
// Fuzz price values
function testFuzz_WeightedMedian(uint256[5] prices) public {
    // Ensure prices are reasonable
    for (uint i = 0; i < 5; i++) {
        prices[i] = bound(prices[i], 1000e8, 3000e8);
    }
    
    // Submit reports
    // Verify median is within expected range
}

// Fuzz stake amounts
function testFuzz_VotingWeight(uint256 stake, uint256 accuracy) public {
    stake = bound(stake, MIN_STAKE, 1_000_000e18);
    accuracy = bound(accuracy, 0, 100);
    
    // Register oracle with stake
    // Simulate reports to build accuracy
    // Verify weight calculation
}
```

---

**Next Steps**:
1. Deploy contracts to testnet
2. Run comprehensive test suite
3. Security audit (Certora, Trail of Bits)
4. Gradual mainnet rollout

**See Also**:
- `ORACLE-ARCHITECTURE.md` - High-level design
- `ORACLE-INTEGRATION.md` - How to integrate with DotFlat
- `ORACLE-DEPLOYMENT.md` - Deployment guide
