// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgastyaTrace
 * @dev Minimal, tamper-evident Ethereum blockchain layer for Ayurvedic herb supply-chain traceability.
 * Stores immutable cryptographic proofs (data hashes) linked in a hash-chain per supply chain ID.
 */
contract AgastyaTrace {
    struct TraceEvent {
        string eventType;
        bytes32 dataHash;
        bytes32 previousHash;
        uint256 timestamp;
        address actor;
    }

    // Mapping from supply chain ID to list of trace events
    mapping(string => TraceEvent[]) private _chainEvents;

    // Mapping from supply chain ID to latest event hash for cryptographic chaining
    mapping(string => bytes32) public latestEventHash;

    // Event emitted upon recording a supply chain event
    event EventAdded(
        string indexed chainId,
        string eventType,
        bytes32 indexed dataHash,
        bytes32 previousHash,
        uint256 timestamp,
        address indexed actor
    );

    /**
     * @notice Record a new supply-chain stage proof
     * @param chainId Unique supply-chain identifier (e.g. MongoDB collector _id)
     * @param eventType Stage type (e.g., COLLECTED, TRANSPORTED, PROCESSED, LAB_TESTED, MANUFACTURED)
     * @param dataHash Cryptographic hash (Keccak-256) of canonical stage data
     * @return newEventHash The new cumulative event hash for the chain
     */
    function addEvent(
        string calldata chainId,
        string calldata eventType,
        bytes32 dataHash
    ) external returns (bytes32 newEventHash) {
        require(bytes(chainId).length > 0, "AgastyaTrace: chainId cannot be empty");
        require(bytes(eventType).length > 0, "AgastyaTrace: eventType cannot be empty");
        require(dataHash != bytes32(0), "AgastyaTrace: dataHash cannot be zero");

        bytes32 prevHash = latestEventHash[chainId];
        uint256 eventTimestamp = block.timestamp;

        TraceEvent memory newEvent = TraceEvent({
            eventType: eventType,
            dataHash: dataHash,
            previousHash: prevHash,
            timestamp: eventTimestamp,
            actor: msg.sender
        });

        _chainEvents[chainId].push(newEvent);

        // Compute the new cumulative hash linking this event with previous proof
        newEventHash = keccak256(
            abi.encodePacked(
                chainId,
                eventType,
                dataHash,
                prevHash,
                eventTimestamp,
                msg.sender
            )
        );

        latestEventHash[chainId] = newEventHash;

        emit EventAdded(
            chainId,
            eventType,
            dataHash,
            prevHash,
            eventTimestamp,
            msg.sender
        );
    }

    /**
     * @notice Get all recorded events for a given chainId
     * @param chainId Supply chain identifier
     * @return Array of TraceEvent structs
     */
    function getEvents(string calldata chainId) external view returns (TraceEvent[] memory) {
        return _chainEvents[chainId];
    }

    /**
     * @notice Get the total count of events recorded for a given chainId
     * @param chainId Supply chain identifier
     * @return Event count
     */
    function getEventCount(string calldata chainId) external view returns (uint256) {
        return _chainEvents[chainId].length;
    }

    /**
     * @notice Get a specific event by index for a chainId
     * @param chainId Supply chain identifier
     * @param index Zero-based index of the event
     */
    function getEvent(string calldata chainId, uint256 index) external view returns (TraceEvent memory) {
        require(index < _chainEvents[chainId].length, "AgastyaTrace: index out of bounds");
        return _chainEvents[chainId][index];
    }
}
