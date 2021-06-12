import React from 'react';
import Web3 from "web3";
import IDOAbi from "./abi/IDO.json";
import BeInCoinAbi from "./abi/BeInCoin.json";
import BEP20Abi from "./abi/BEP20.json";
import {Col, Row, Card, CardTitle, CardText, Button, Input, Collapse, Table} from 'reactstrap';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            web3: null,
            contract: null,
            isConnectWallet: false,
            buyAmount: 0,
            bonusCurrent: 0,
            rateInput: 0,
            bicUser: 0,
            busdUser: 0,
            bicBalance: 0,
            busdBalance: 0,
            rateOutput: 0,
            _rateInput: 0,
            _rateOutput: 0,
            bicAddress: null,
            busdAddress: null,
            withdrawToken: null,
            transferAdmin: null,
            whitelist: null,
            adminAddress: null,
            currentAddress: null,
            soldDetails: [],
            receivedDetails: [],
            whiteListResult: [],
            isAdmin: false,
            isShowDetails: false,
            isBuyable: false,
            releaseWallet: null,
            // bic
            listAdminRoleBIC: [],
            listBlackListRoleBIC: [],
            listPauseRoleBIC: [],
            listTransferRoleBIC: [],
            listBlockAddressBIC: [],
            totalSupplyBIC: 0,
            isPauseBIC: false,
            symbolBIC: '',
            nameBIC: '',
            timeUnlockTransferBIC: [],
        }
    }
    componentDidMount() {
        this.syncStaticData().then(() => {
            this.syncContractBalance()
        })
        this.syncChangeableData()
        this.syncBuyLogs()
    }

    connectWithMetamask() {
        if(window.ethereum) {
            const self = this
            this.setState({
                web3: new Web3(window.ethereum)
            }, async function () {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' })
                    const addresses = await self.state.web3.eth.getAccounts()
                    this.setState({
                        contract: new this.state.web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT),
                        isConnectWallet: true,
                        currentAddress: addresses[0],
                        releaseWallet: addresses[0]
                    }, function () {
                        self.syncUserBalance()
                    })
                    if (this.state.adminAddress === this.state.currentAddress) {
                        this.state.isAdmin = true
                    } else {
                        this.state.isAdmin = false
                    }

                    window.ethereum.on('accountsChanged', function(addresses){
                        self.setState({
                            currentAddress: addresses[0],
                            releaseWallet: addresses[0]
                        })
                    })
                } catch (e) {
                    alert(`Something went wrong?\n ${e.message}`)
                }
            })
        } else alert('You need to have metamask first!')
    }

    async syncStaticData() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const bicAddr = await contract.methods.bicToken().call()
        const busdAddr = await contract.methods.busdToken().call()
        this.setState({
            bicAddress: bicAddr,
            busdAddress: busdAddr,
            withdrawToken: bicAddr
        })
    }

    async syncChangeableData() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const rateInput = await contract.methods.input().call()
        const rateOutput = await contract.methods.output().call()
        const adminAddr = await contract.methods.owner().call()
        this.setState({
            adminAddress: adminAddr,
            rateInput: rateInput,
            rateOutput: rateOutput,
            _rateInput: rateInput,
            _rateOutput: rateOutput,
        })
    }

    async syncContractBalance() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const bicContract = new web3.eth.Contract(BeInCoinAbi, this.state.bicAddress)
        const busdContract = new web3.eth.Contract(BEP20Abi, this.state.busdAddress)
        const _bicBalance = await bicContract.methods.balanceOf(process.env.REACT_APP_IDO_CONTRACT).call()
        const _busdBalance = await busdContract.methods.balanceOf(process.env.REACT_APP_IDO_CONTRACT).call()
        const _totalSupply = await bicContract.methods.totalSupply().call()

        this.setState({
            bicBalance: Web3.utils.fromWei(_bicBalance),
            busdBalance: Web3.utils.fromWei(_busdBalance),
            totalSupplyBIC: Web3.utils.fromWei(_totalSupply),
        })
    }

    async syncUserBalance() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const bicContract = new web3.eth.Contract(BeInCoinAbi, this.state.bicAddress)
        const busdContract = new web3.eth.Contract(BEP20Abi, this.state.busdAddress)
        const idoContract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const _bicBalance = await bicContract.methods.balanceOf(this.state.currentAddress).call()
        const _busdBalance = await busdContract.methods.balanceOf(this.state.currentAddress).call()

        const whiteList = await idoContract.methods.whitelist(this.state.currentAddress).call()
        console.log('whiteList: ', whiteList)
        let startDecay = await idoContract.methods.startDecay().call()
        let deltaDecay = await idoContract.methods.deltaDecay().call()
        let blockCurrent = await web3.eth.getBlockNumber()
        let bonus = 100;
        if (blockCurrent > startDecay) {
            let countDecay = Math.floor((blockCurrent - startDecay)/(deltaDecay));
            if (countDecay < 10) {
                bonus = 100 - countDecay*10;
            } else {
                bonus = 0;
            }
        }
        this.setState({
            bicUser: Web3.utils.fromWei(_bicBalance),
            busdUser: Web3.utils.fromWei(_busdBalance),
            isBuyable: whiteList,
            bonusCurrent: bonus,
        })
    }

    async syncBuyLogs() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const pastEvent = await contract.getPastEvents('BuySuccess', { fromBlock: 0, toBlock: 'latest' })
        let soldLogs = []
        let receivedLogs = []
        pastEvent.forEach(e => {
            const result = e.returnValues
            soldLogs.push({
                time: new Date(result.time*1000),
                amount: result.bicAmount,
                user: result.buyer,
            })
            receivedLogs.push({
                time: new Date(result.time*1000),
                amount: result.busdAmount,
                user: result.buyer,
            })
        })
        this.setState({
            soldDetails: soldLogs,
            receivedDetails: receivedLogs,
        })
    }

    async syncWhiteList() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const addEvent = await contract.getPastEvents('AddToWhitelist', { fromBlock: 0, toBlock: 'latest' })
        const removeEvent = await contract.getPastEvents('RemoveToWhitelist', { fromBlock: 0, toBlock: 'latest' })
        let mapEvent=new Map()
        addEvent.forEach(e => {
            const result = e.returnValues
            mapEvent.set(result._addr, result.time);
        })
        removeEvent.forEach(e => {
            const result = e.returnValues
            if (mapEvent.has(result._addr)) {
                let temp = mapEvent.get(result._addr)
                if (result.time > temp) {
                    mapEvent.delete(result._addr)
                }
            }
        })
        let listEvent = []
        for (const [keyMap, valueMap] of mapEvent.entries()) {
            listEvent.push({
                time: new Date(valueMap*1000),
                address: keyMap,
            })
        }
        this.setState({
            whiteListResult: listEvent,
        })
    }

    async syncBeinCoin() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const bicContract = new web3.eth.Contract(BeInCoinAbi, this.state.bicAddress)

        const DEFAULT_ADMIN_ROLE = await bicContract.methods.DEFAULT_ADMIN_ROLE().call()
        const BLACK_LIST_ROLE = await bicContract.methods.BLACK_LIST_ROLE().call()
        const PAUSER_ROLE = await bicContract.methods.PAUSER_ROLE().call()
        const TRANSFER_ROLE = '0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c' // temp
        const countAdminRole = await bicContract.methods.getRoleMemberCount(DEFAULT_ADMIN_ROLE).call()
        let listAdmin = []
        for (let i = 0; i < countAdminRole; i++) {
            let addr = await bicContract.methods.getRoleMember(DEFAULT_ADMIN_ROLE, i).call()
            listAdmin.push(addr)
        }

        const countBlackListRole = await bicContract.methods.getRoleMemberCount(BLACK_LIST_ROLE).call()
        let listBlackList = []
        for (let i = 0; i < countBlackListRole; i++) {
            let addr = await bicContract.methods.getRoleMember(BLACK_LIST_ROLE, i).call()
            listBlackList.push(addr)
        }

        const countPauseRole = await bicContract.methods.getRoleMemberCount(PAUSER_ROLE).call()
        let listPause = []
        for (let i = 0; i < countPauseRole; i++) {
            let addr = await bicContract.methods.getRoleMember(PAUSER_ROLE, i).call()
            listPause.push(addr)
        }

        const countTransferRole = await bicContract.methods.getRoleMemberCount(TRANSFER_ROLE).call()
        let listTransfer = []
        for (let i = 0; i < countTransferRole; i++) {
            let addr = await bicContract.methods.getRoleMember(TRANSFER_ROLE, i).call()
            listTransfer.push(addr)
        }

        const blockAddressEvent = await bicContract.getPastEvents('BlockAddress', { fromBlock: 0, toBlock: 'latest' })
        const unBlockAddressEvent = await bicContract.getPastEvents('UnblockAddress', { fromBlock: 0, toBlock: 'latest' })
        let mapEvent=new Map()
        blockAddressEvent.forEach(e => {
            const result = e.returnValues
            mapEvent.set(result.addr, result.time);
        })
        unBlockAddressEvent.forEach(e => {
            const result = e.returnValues
            if (mapEvent.has(result.addr)) {
                let temp = mapEvent.get(result.addr)
                if (result.time > temp) {
                    mapEvent.delete(result.addr)
                }
            }
        })
        let listEventBlockAddress = []
        for (const [keyMap, valueMap] of mapEvent.entries()) {
            listEventBlockAddress.push({
                time: new Date(valueMap*1000),
                address: keyMap,
            })
        }
        let isPause = await bicContract.methods.paused().call()
        let name = await bicContract.methods.name().call()
        let symbol = await bicContract.methods.symbol().call()
        let timeUnlock = await bicContract.methods.timeUnlockTransfer().call()
        let timeUnlockList = []
        timeUnlockList.push({
            time: new Date(timeUnlock*1000),
        })
        this.setState({
            listAdminRoleBIC: listAdmin,
            listBlackListRoleBIC: listBlackList,
            listPauseRoleBIC: listPause,
            listTransferRoleBIC: listTransfer,
            listBlockAddressBIC: listEventBlockAddress,
            isPauseBIC: isPause,
            nameBIC: name,
            symbolBIC: symbol,
            timeUnlockTransferBIC: timeUnlockList,
        })
    }

    handleChange(event) {
        this.setState({[event.target.name]: event.target.value});
    }

    async updatePrice() {
        await this.state.contract.methods.updatePrice(this.state._rateInput, this.state._rateOutput).send({from: this.state.currentAddress})
        await this.syncChangeableData()
    }

    async withdrawToken() {
        await this.state.contract.methods.withdraw(this.state.withdrawToken).send({from: this.state.currentAddress})
        await this.syncContractBalance()
        await this.syncUserBalance()
    }

    async transferAdmin() {
        await this.state.contract.methods.transferOwnership(this.state.transferAdmin).send({from: this.state.currentAddress})
        await this.syncChangeableData()
    }

    async addWhiteList() {
        await this.state.contract.methods.addToWhitelist(this.state.whitelist).send({from: this.state.currentAddress})
        await this.syncChangeableData()
    }
    async removeWhiteList() {
        await this.state.contract.methods.removeToWhitelist(this.state.whitelist).send({from: this.state.currentAddress})
        await this.syncChangeableData()
    }

    async buyBIC() {
        const busdContract = new this.state.web3.eth.Contract(BEP20Abi, this.state.busdAddress)
        const allowance = await busdContract.methods.allowance(this.state.currentAddress, process.env.REACT_APP_IDO_CONTRACT).call()
        if(allowance < this.state.buyAmount*1e18) {
            await busdContract.methods.approve(process.env.REACT_APP_IDO_CONTRACT, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
                .send({from: this.state.currentAddress})
        }
        await this.state.contract.methods.buy(Web3.utils.toWei(this.state.buyAmount)).send({from: this.state.currentAddress})
        await this.syncContractBalance()
        await this.syncUserBalance()
    }

    async releaseBIC() {
        await this.state.contract.methods.releaseBic(this.state.releaseWallet).send({from: this.state.currentAddress})
        await this.syncChangeableData()
    }

    amountReport(details) {
        return details.reduce((r, e) => {
            return r + parseFloat(Web3.utils.fromWei(e.amount))
        }, 0)
    }

    toggle() {
        this.setState({isShowDetails: !this.state.isShowDetails});
        this.syncWhiteList()
        this.syncBeinCoin()
    }

    render() {
        return (
            <div>
                <Row>
                    <Col md="3">
                        <h1>BeIn IDO page</h1>
                    </Col>
                    <Col md="3">
                        <Button onClick={() => this.connectWithMetamask()}>Connect metamask</Button>
                    </Col>
                    <Col md="2"><a href={`https://testnet.bscscan.com/address/${process.env.REACT_APP_IDO_CONTRACT}`}>IDO contract</a></Col>
                    <Col md="2"><a href={`https://testnet.bscscan.com/address/${this.state.bicAddress}`}>BIC contract</a></Col>
                    <Col md="2"><a href={`https://testnet.bscscan.com/address/${this.state.busdAddress}`}>BUSD contract</a></Col>
                </Row>
                <Row>
                    <h2>User:</h2><p>{this.state.currentAddress}</p>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Buy BIC (BUSD):</CardTitle>
                            <Input name="buyAmount" type="number" value={this.state.buyAmount} onChange={(e) => this.handleChange(e)}/>
                            <Button disabled={!this.state.isConnectWallet} onClick={() => this.buyBIC()}>Buy</Button>
                        </Card>
                    </Col>
                    <Col md="2">
                        <Card body>
                            <CardTitle tag="h3">Receive:</CardTitle>
                            <p>{this.state.buyAmount * this.state.rateOutput / this.state.rateInput *(100 + this.state.bonusCurrent)/100 || 0} BIC</p>
                        </Card>
                        <Card body>
                            <CardTitle tag="h3">Can you buy?</CardTitle>
                            <p>{this.state.isBuyable ? 'Yes' : 'No'}</p>
                        </Card>
                    </Col>
                    <Col md="2">
                        <Card body>
                            <CardTitle tag="h3">Balance:</CardTitle>
                            <p>{this.state.bicUser} BIC</p>
                            <p>{this.state.busdUser} BUSD</p>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Note:</CardTitle>
                            <CardText>The first time you buy, we need to request your permission to using your BUSD.</CardText>
                        </Card>
                    </Col>
                </Row>
                <Row style={this.state.isAdmin ? {} : { display: 'none' }}>
                    <h2>Admin:</h2><p>{this.state.adminAddress}</p>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Update price (current 1BUSD = {this.state.rateOutput/this.state.rateInput || 0}BIC):</CardTitle>
                            <Input type="number" placeholder="BUSD Rate" name="_rateInput" value={this.state._rateInput} onChange={(e) => this.handleChange(e)}/>
                            <Input type="number" placeholder="BIC Rate" name="_rateOutput" value={this.state._rateOutput} onChange={(e) => this.handleChange(e)}  />
                            <Button disabled={!this.state.isConnectWallet} onClick={() => this.updatePrice()}>Change</Button>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Withdraw token:</CardTitle>
                            <CardText>BIC: {this.state.bicBalance}</CardText>
                            <CardText>BUSD: {this.state.busdBalance}</CardText>
                            <Input type="select" name="withdrawToken" value={this.state.withdrawToken} onChange={(e) => this.handleChange(e)} >
                                <option value={this.state.bicAddress}>BIC</option>
                                <option value={this.state.busdAddress}>BUSD</option>
                            </Input>
                            <Button disabled={!this.state.isConnectWallet} onClick={() => this.withdrawToken()}>Withdraw</Button>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Transfer admin:</CardTitle>
                            <Input type="string" name="transferAdmin" value={this.state.transferAdmin} onChange={(e) => this.handleChange(e)}  />
                            <Button disabled={!this.state.isConnectWallet} onClick={() => this.transferAdmin()}>Transfer</Button>
                        </Card>
                        <Card body>
                            <CardTitle tag="h3">Whitelist:</CardTitle>
                            <Input type="string" name="whitelist" value={this.state.whitelist} onChange={(e) => this.handleChange(e)}  />
                            <div>
                                <Button disabled={!this.state.isConnectWallet} onClick={() => this.addWhiteList()}>Add</Button>
                                <Button disabled={!this.state.isConnectWallet} onClick={() => this.removeWhiteList()}>Remove</Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
                <Row style={this.state.isAdmin ? {} : { display: 'none' }}>
                    <Row>
                        <Col md="4"><h2>IDO info:</h2></Col>
                        <Col md="4"><Button onClick={() => this.syncBuyLogs()}>Refresh</Button></Col>
                        <Col md="4"><Button onClick={() => this.toggle()}>Show detail</Button></Col>
                    </Row>
                    <Row>
                        <h3>Total sold BIC:  {this.amountReport(this.state.soldDetails) || 0}</h3>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Time</th>
                                            <th>Address</th>
                                            <th>Amount (BIC)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {this.state.soldDetails.map((e,index) => <tr>
                                            <th key={'sold' + index}>{index + 1}</th>
                                            <td>{e.time.toString()}</td>
                                            <td>{e.user}</td>
                                            <td>{Web3.utils.fromWei(e.amount)}</td>
                                        </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                    <Row>
                        <h3>Total received BUSD: {this.amountReport(this.state.receivedDetails) || 0}</h3>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Time</th>
                                        <th>Address</th>
                                        <th>Amount (BUSD)</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.receivedDetails.map((e,index) => <tr>
                                        <th key={'receive' + index}>{index + 1}</th>
                                        <td>{e.time.toString()}</td>
                                        <td>{e.user}</td>
                                        <td>{Web3.utils.fromWei(e.amount)}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                        <h3>Whitelist: {this.state.whiteListResult.length}</h3>
                    <Row>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Time</th>
                                        <th>Address</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.whiteListResult.map((e,index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e.time.toString()}</td>
                                        <td>{e.address}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                </Row>
                 {/* BIC */}
                <Row style={this.state.isAdmin ? {} : { display: 'none' }}>
                    <Row>
                        <Col md="4"><h2>Bein Coin contract info:</h2></Col>
                    </Row>
                    <h3>Total supply: {this.state.totalSupplyBIC} {this.state.symbolBIC} ({this.state.nameBIC})</h3>
                    <h3>Time unlock transfer BIC:</h3>
                        {this.state.timeUnlockTransferBIC.map((e,index) => <tr>
                            <td>{e.time.toString()}</td>
                        </tr>)}
                    <h3>System BIC is Pause: {this.state.isPauseBIC.toString()}</h3>
                    <h3>List address has ADMIN role: {this.state.listAdminRoleBIC.length}</h3>
                    <Row>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Address</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.listAdminRoleBIC.map((e,index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                    <h3>List address has BLACK_LIST role: {this.state.listBlackListRoleBIC.length}</h3>
                    <Row>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Address</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.listBlackListRoleBIC.map((e,index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                    <h3>List address has PAUSE role: {this.state.listPauseRoleBIC.length}</h3>
                    <Row>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Address</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.listPauseRoleBIC.map((e,index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                    <h3>List address has TRANSFER role: {this.state.listTransferRoleBIC.length}</h3>
                    <Row>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Address</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.listTransferRoleBIC.map((e,index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                    <h3>Black List Address: {this.state.listBlockAddressBIC.length}</h3>
                    <Row>
                        <Collapse isOpen={this.state.isShowDetails}>
                            <Card>
                                <Table>
                                    <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Address</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {this.state.listBlockAddressBIC.map((e,index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Collapse>
                    </Row>
                </Row>
            </div>
        )
    }
}

export default App;
