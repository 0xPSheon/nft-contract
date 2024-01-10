// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./libs/ERC721A.sol";

contract NFT is ERC721A, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Modifier
    modifier onlyEOA() {
        require(msg.sender == tx.origin, "The caller is another contract");
        _;
    }

    modifier onlyBackendVerified(bytes memory _signature) {
        bytes32 msgHash = keccak256(
            abi.encodePacked(name(), msg.sender, currentPhaseName)
        );
        require(
            !comparePhaseName(currentPhaseName, "Public Sale"),
            "Not legal phase"
        );
        require(isValidSignature(msgHash, _signature), "Not authorized");
        _;
    }

    modifier onlyPublicPhase() {
        require(
            comparePhaseName(currentPhaseName, "Public Sale"),
            "Not public phase"
        );
        _;
    }

    modifier mintCompliance(uint256 quantity) {
        require(initialized, "Not initialized");
        require(currentPhaseMaxMintPerAddress > 0, "Not allow to mint");
        require(quantity <= maxMintPerTx, "Over transaction limit");
        require(
            msg.value >= currentPhasePrice * quantity,
            "Not enough ether sent"
        );
        require(
            addressClaimedCountForCurrentPhase[currentPhaseName][msg.sender] +
                quantity <=
                currentPhaseMaxMintPerAddress,
            "Over phase limit"
        );
        require(
            totalClaimedCountForCurrentPhase[currentPhaseName] + quantity <=
                currentPhaseMaxSupply,
            "Over phase supply"
        );
        require(
            totalSupply() + quantity <= collectionSize,
            "Reached max supply"
        );
        _;
    }

    // Constants
    address private rootSigner;
    string private unrevealedURI;

    mapping(string => mapping(address => uint256))
        public addressClaimedCountForCurrentPhase;
    mapping(string => uint256) public totalClaimedCountForCurrentPhase;

    bool public initialized;
    bool public isRevealed;

    uint256 public maxMintPerTx;
    uint256 public collectionMaxSupply;
    uint256 public maxSupplyForDev;

    string public baseURI;
    string public extension = ".json";
    string public currentPhaseName = "Preparing";

    uint256 public currentPhasePrice;
    uint256 public currentPhaseMaxMintPerAddress;
    uint256 public currentPhaseMaxSupply;

    constructor(
        uint256 _maxMintPerTx,
        uint256 _collectionMaxSupply,
        uint256 _maxSupplyForDev
    ) ERC721A("NFT", "NFT", _maxMintPerTx, _collectionMaxSupply) {
        maxMintPerTx = _maxMintPerTx;
        collectionMaxSupply = _collectionMaxSupply;
        maxSupplyForDev = _maxSupplyForDev;
    }

    function setRootSigner(address _newRootSigner) external onlyOwner {
        rootSigner = _newRootSigner;
    }

    function reveal() external onlyOwner {
        isRevealed = true;
    }

    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseURI = _newBaseURI;
    }

    function setExtension(string memory _newExtension) external onlyOwner {
        extension = _newExtension;
    }

    function setUnrevealURI(
        string memory _newUnrevealedURI
    ) external onlyOwner {
        unrevealedURI = _newUnrevealedURI;
    }

    function setPhase(
        string calldata _newPhaseName,
        uint256 _newPhasePrice,
        uint256 _newPhaseMaxMintPerAddress,
        uint256 _newPhaseMaxSupply
    ) external onlyOwner {
        currentPhaseName = _newPhaseName;
        currentPhasePrice = _newPhasePrice;
        currentPhaseMaxMintPerAddress = _newPhaseMaxMintPerAddress;
        currentPhaseMaxSupply = _newPhaseMaxSupply;
    }

    function setMaxMintPerTx(uint256 _maxMint) external onlyOwner {
        maxMintPerTx = _maxMint;
    }

    function setPhasePrice(uint256 _newPhasePrice) external onlyOwner {
        currentPhasePrice = _newPhasePrice;
    }

    function setPhaseMaxMintPerAddress(
        uint256 _newPhaseMaxMintPerAddress
    ) external onlyOwner {
        currentPhaseMaxMintPerAddress = _newPhaseMaxMintPerAddress;
    }

    function setPhaseMaxSupply(uint256 _newPhaseMaxSupply) external onlyOwner {
        currentPhaseMaxSupply = _newPhaseMaxSupply;
    }

    function initialize(
        address _rootSigner,
        string calldata _initBaseURI,
        string calldata _initUnrevealedURI,
        string calldata _initPhaseName,
        uint256 _initPhasePrice,
        uint256 _initPhaseMaxMintPerAddress,
        uint256 _initPhaseMaxSupply
    ) external onlyOwner {
        require(!initialized, "Initialization can only be done once");

        initialized = true;

        // Root Signer
        rootSigner = _rootSigner;
        // Base URI
        baseURI = _initBaseURI;
        // Unrevealed URI
        unrevealedURI = _initUnrevealedURI;
        // Phase Name
        currentPhaseName = _initPhaseName;
        // Phase Price
        currentPhasePrice = _initPhasePrice;
        // Phase Max Mint Limitation
        currentPhaseMaxMintPerAddress = _initPhaseMaxMintPerAddress;
        // Phase Max Supply
        currentPhaseMaxSupply = _initPhaseMaxSupply;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(_exists(tokenId), "Nonexistent token");
        string memory currentBaseURI = _baseURI();

        if (isRevealed) {
            return
                bytes(currentBaseURI).length > 0
                    ? string(
                        abi.encodePacked(
                            currentBaseURI,
                            Strings.toString(tokenId),
                            extension
                        )
                    )
                    : "";
        }

        return unrevealedURI;
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) public view returns (bool isValid) {
        return hash.recover(signature) == rootSigner;
    }

    function mintCards(
        bytes memory signature,
        uint256 quantity
    ) external payable onlyBackendVerified(signature) onlyEOA {
        _mint(quantity);
        refundIfOver(currentPhasePrice * quantity);
    }

    function mintCardsPublic(
        uint256 quantity
    ) external payable onlyPublicPhase onlyEOA {
        _mint(quantity);
        refundIfOver(currentPhasePrice * quantity);
    }

    function mintCardsForAddress(
        address receiver,
        uint256 quantity
    ) external onlyOwner {
        require(initialized, "Not initialized");
        require(
            totalSupply() + quantity <= maxSupplyForDev,
            "Too many already minted before dev mint"
        );
        require(
            quantity % maxBatchSize == 0,
            "Can only mint a multiple of the maxBatchSize"
        );
        uint256 numChunks = quantity / maxBatchSize;
        for (uint256 i = 0; i < numChunks; i++) {
            _safeMint(receiver, maxBatchSize);
        }
    }

    function withdraw(address receiver) external onlyOwner nonReentrant {
        (bool success, ) = receiver.call{value: address(this).balance}("");
        require(success, "Transfer failed.");
    }

    function setOwnersExplicit(
        uint256 quantity
    ) external onlyOwner nonReentrant {
        _setOwnersExplicit(quantity);
    }

    function numberMinted(address owner) public view returns (uint256) {
        return _numberMinted(owner);
    }

    function getOwnershipData(
        uint256 tokenId
    ) external view returns (TokenOwnership memory) {
        return ownershipOf(tokenId);
    }

    fallback() external payable {}

    receive() external payable {}

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function _mint(uint256 quantity) internal onlyEOA mintCompliance(quantity) {
        addressClaimedCountForCurrentPhase[currentPhaseName][
            msg.sender
        ] += quantity;
        totalClaimedCountForCurrentPhase[currentPhaseName] += quantity;

        _safeMint(msg.sender, quantity);
    }

    function comparePhaseName(
        string memory str1,
        string memory str2
    ) public pure returns (bool) {
        if (bytes(str1).length != bytes(str2).length) {
            return false;
        }
        return
            keccak256(abi.encodePacked(str1)) ==
            keccak256(abi.encodePacked(str2));
    }

    function refundIfOver(uint256 price) private {
        require(msg.value >= price, "Need to send more ETH.");
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }
}
