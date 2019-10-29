# TODOs:

- [x] Testing for staking change
- [x] Refactor of smart contract: ballots unification, gas cost optimization
- [ ] Implement justice voting
- [ ] ERC20 alternatives that pose no cost for the user to claim its rewards.
- [ ] Change reward release process so that it is the user who mints the new tokens with a federation signed message, so that the user can claim its reward if the federation is not available.
- [ ] Implement rewarding for the federation.
- [ ] Implement block summary upload
- [x] Implement testing with truffle suite and openzeppelin-test-helpers. This includes implementing best practices for contract testing (e.g. using beforeEach to reset the contract and test complete workflows)
- [x] Implement contract events and their testing
- [x] Implement ERC777 token
- [ ] Implement token lock compatible with ERC777 token
- [ ] Implement tests for the ERC777 model.

# Using gulp

To use gulp and automatically running tests while developing, you can use

- To watch over all changes in the ethereum directory: `gulp watch`
- To watch only changes related to a single contract: `CONTRACT=<ContractName> gulp watch`. Example: `CONTRACT=BatchMint gulp watch`
