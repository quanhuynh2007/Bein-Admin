import React from 'react';
import Web3 from "web3";
import IDOAbi from "./abi/IDO.json";
import BeInCoinAbi from "./abi/BeinChain.json";
import BEP20Abi from "./abi/BEP20.json";
import axios from "axios";
import {Col, Row, Card, CardTitle, CardText, Button, Input, Table} from 'reactstrap';

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
            whiteListResult2: [],
            historyContribute1: [],
            historyContribute2: [],
            historyFilter1: [],
            historyFilter2: [],
            filter1: 'ALL',
            filter2: 'ALL',
            sumBUSD1: 0,
            sumBIC1: 0,
            sumBUSD2: 0,
            sumBIC2: 0,
            filterTime: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ownerContract1: '',
            ownerContract2: '',
            isAdmin: false,
            isShowDetails: false,
            isShowWhitelist: true,
            isShowHistoryContribute: false,
            isBuyable: false,
            releaseWallet: null,
        }
    }

    componentDidMount() {
        this.syncStaticData().then(() => {
            this.syncContractBalance()
            this.syncWhiteListFull()
            this.syncHistoryContributeFull()
            this.syncContractInfo()
        })
        this.syncChangeableData()
        this.syncBuyLogs()
        this.syncHandleChangeFilter1("ALL")
    }

    connectWithMetamask() {
        if (window.ethereum) {
            const self = this
            this.setState({
                web3: new Web3(window.ethereum)
            }, async function () {
                try {
                    await window.ethereum.request({method: 'eth_requestAccounts'})
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
                        this.state.isAdmin = true
                    }

                    window.ethereum.on('accountsChanged', function (addresses) {
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
        this.setState({
            bicBalance: Web3.utils.fromWei(_bicBalance),
            busdBalance: Web3.utils.fromWei(_busdBalance),
        })
    }

    async syncContractInfo() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract1 = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const contract2 = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT2)
        let owner1 = await contract1.methods.owner().call()
        let owner2 = await contract2.methods.owner().call()
        this.setState({
            ownerContract1: owner1,
            ownerContract2: owner2,
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
            let countDecay = Math.floor((blockCurrent - startDecay) / (deltaDecay));
            if (countDecay < 10) {
                bonus = 100 - countDecay * 10;
            } else {
                bonus = 0;
            }
        }
        this.setState({
            bicUser: Web3.utils.fromWei(_bicBalance),
            busdUser: Web3.utils.fromWei(_busdBalance),
            bonusCurrent: bonus,
            isBuyable: whiteList
        })
    }

    async syncBuyLogs() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const pastEvent = await contract.getPastEvents('BuySuccess', {fromBlock: 'latest', toBlock: 'latest'})
        let soldLogs = []
        let receivedLogs = []
        pastEvent.forEach(e => {
            const result = e.returnValues
            soldLogs.push({
                time: new Date(result.time * 1000),
                amount: result.bicAmount,
                user: result.buyer,
            })
            receivedLogs.push({
                time: new Date(result.time * 1000),
                amount: result.busdAmount,
                user: result.buyer,
            })
        })
        this.setState({
            soldDetails: soldLogs,
            receivedDetails: receivedLogs,
        })
    }

    async syncTopic(addressIDO, topic) {
        try {
            const response = await axios.get(process.env.REACT_APP_BSC_SCAN_API, {
                params: {
                    module: "logs",
                    action: "getLogs",
                    address: addressIDO,
                    topic0: topic,
                    apikey: process.env.REACT_APP_BSC_SCAN_API_TOKEN,
                }
            });
            return response.data.result;
        } catch (error) {
            return [];
        }
    }

    async syncWhiteListFull() {
        let list1 = await this.syncWhiteList(process.env.REACT_APP_IDO_CONTRACT)
        let list2 = await this.syncWhiteList(process.env.REACT_APP_IDO_CONTRACT2)
        this.setState({
            whiteListResult: list1,
            whiteListResult2: list2,
        })
    }

    async syncWhiteList(addressIDO) {
        let addEvent = await this.syncTopic(addressIDO, '0xaf031152c1a6c5d679409baa43923a71689187e8c73f3e9b156b411d011a1fe0') // add wl
        let mapEvent = new Map()
        addEvent.forEach(e => {
            let data = e.data
            let addr = '0x' + data.substring(26, 66)
            let time = parseInt('0x' + data.substring(122, 131))
            mapEvent.set(addr, time);
        })
        let removeEvent = await this.syncTopic(addressIDO, '0x732404ef841efeaff56d1e6eaf5fadebab6b9c973698f5dcee406980b3498f38') // remove wl
        if (Array.isArray(removeEvent)) {
            removeEvent.forEach(e => {
                let data = e.data
                let addr = '0x' + data.substring(26, 66)
                let time = parseInt('0x' + data.substring(122, 131))
                if (mapEvent.has(addr)) {
                    let tempTime = mapEvent.get(addr)
                    if (time > tempTime) {
                        mapEvent.delete(addr)
                    }
                }
            })
        }
        let listEvent = []
        for (const [keyMap, valueMap] of mapEvent.entries()) {
            listEvent.push({
                time: this.formatDatetime(valueMap),
                address: keyMap,
            })
        }
        return listEvent;
    }

    async syncHistoryContributeFull() {
        let list1 = await this.syncHistoryContribute(process.env.REACT_APP_IDO_CONTRACT)
        let list2 = await this.syncHistoryContribute(process.env.REACT_APP_IDO_CONTRACT2)
        this.setState({
            historyContribute1: list1,
            historyContribute2: list2,
        })
    }

    async syncHistoryContribute(addressIDO) {
        let eventBuy = await this.syncTopic(addressIDO, '0xebdbbd9ad9f8301392fafec9c34b3d92288ebfc5a5811c398b9ba01ce36e1590') // buy
        let listBuy = []
        eventBuy.forEach(e => {
            let data = e.data
            let buyer = '0x' + data.substring(26, 66)
            let busdNumber = parseInt('0x' + data.substring(67, 130)) / (1e18)
            let bicNumber = parseInt('0x' + data.substring(131, 194)) / (1e18)
            let time = this.formatDatetime(parseInt('0x' + data.substring(249, 258)))
            listBuy.push({
                buyer: buyer,
                busd: busdNumber,
                bic: bicNumber,
                time: time,
            })
        })
        return listBuy
    }

    async syncHandleChangeFilter1(valueMonth) {
        let listBuy = []
        let sumBIC = 0
        let sumBUSD = 0
        let checkAll = false
        if (valueMonth === "ALL") {
            checkAll = true
        }
        this.state.historyContribute1.forEach(e => {
            if (e.time.indexOf(valueMonth) >= 0 || checkAll) {
                sumBIC += e.bic
                sumBUSD += e.busd
                let buyer = e.buyer
                let busdNumber = e.busd
                let bicNumber = e.bic
                let time = e.time
                listBuy.push({
                    buyer: buyer,
                    busd: busdNumber,
                    bic: bicNumber,
                    time: time,
                })
            }
        })
        this.setState({
            historyFilter1: listBuy,
            sumBIC1: sumBIC,
            sumBUSD1: sumBUSD,
        })
    }

    async syncHandleChangeFilter2(valueMonth) {
        let listBuy = []
        let sumBIC = 0
        let sumBUSD = 0
        let checkAll = false
        if (valueMonth === "ALL") {
            checkAll = true
        }
        this.state.historyContribute2.forEach(e => {
            if (e.time.indexOf(valueMonth) >= 0 || checkAll) {
                sumBIC += e.bic
                sumBUSD += e.busd
                let buyer = e.buyer
                let busdNumber = e.busd
                let bicNumber = e.bic
                let time = e.time
                listBuy.push({
                    buyer: buyer,
                    busd: busdNumber,
                    bic: bicNumber,
                    time: time,
                })
            }
        })
        this.setState({
            historyFilter2: listBuy,
            sumBIC2: sumBIC,
            sumBUSD2: sumBUSD,
        })
    }

    handleChange(event) {
        this.setState({[event.target.name]: event.target.value});
    }

    async handleChangeFilter1(event) {
        this.setState({[event.target.name]: event.target.value});
        await this.syncHandleChangeFilter1(event.target.value);
    }

    async handleChangeFilter2(event) {
        this.setState({[event.target.name]: event.target.value});
        await this.syncHandleChangeFilter2(event.target.value);
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

    showWhitelist() {
        this.setState({isShowWhitelist: !this.state.isShowWhitelist});
    }

    showHistoryContribute() {
        this.setState({isShowHistoryContribute: !this.state.isShowHistoryContribute});
    }

    async buyBIC() {
        const busdContract = new this.state.web3.eth.Contract(BEP20Abi, this.state.busdAddress)
        const allowance = await busdContract.methods.allowance(this.state.currentAddress, process.env.REACT_APP_IDO_CONTRACT).call()
        if (allowance < this.state.buyAmount * 1e18) {
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

    formatDatetime(timestamp) {
        const a = new Date(timestamp * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = a.getFullYear();
        const month = months[a.getMonth()];
        const date = a.getDate().toString().padStart(2, '0');
        const hour = a.getHours().toString().padStart(2, '0');
        const min = a.getMinutes().toString().padStart(2, '0');
        const sec = a.getSeconds().toString().padStart(2, '0');
        return date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    }

    toggle() {
        this.setState({isShowDetails: !this.state.isShowDetails});
    }

    render() {
        return (
            <div>
                <Row>
                    <Col md="3">
                        <h1>Bein contract info</h1>
                    </Col>
                    <Col md="3">
                        <Button onClick={() => this.connectWithMetamask()}>Connect metamask</Button>
                    </Col>
                    <Col md="2"><a href={`https://bscscan.com/address/${process.env.REACT_APP_IDO_CONTRACT}`}>IDO
                        contract</a></Col>
                    <Col md="2"><a href={`https://bscscan.com/address/${this.state.bicAddress}`}>BIC contract</a></Col>
                    <Col md="2"><a href={`https://bscscan.com/address/${this.state.busdAddress}`}>BUSD
                        contract</a></Col>
                </Row>
                <Row style={this.state.isAdmin ? {} : {display: 'none'}}>
                    <h2>Admin:</h2><p>{this.state.adminAddress}</p>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Update price (current 1BUSD
                                = {this.state.rateOutput / this.state.rateInput || 0}BIC):</CardTitle>
                            <Input type="number" placeholder="BUSD Rate" name="_rateInput" value={this.state._rateInput}
                                   onChange={(e) => this.handleChange(e)}/>
                            <Input type="number" placeholder="BIC Rate" name="_rateOutput"
                                   value={this.state._rateOutput} onChange={(e) => this.handleChange(e)}/>
                            <Button disabled={!this.state.isConnectWallet}
                                    onClick={() => this.updatePrice()}>Change</Button>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Withdraw token:</CardTitle>
                            <CardText>BIC: {this.state.bicBalance}</CardText>
                            <CardText>BUSD: {this.state.busdBalance}</CardText>
                            <Input type="select" name="withdrawToken" value={this.state.withdrawToken}
                                   onChange={(e) => this.handleChange(e)}>
                                <option value={this.state.bicAddress}>BIC</option>
                                <option value={this.state.busdAddress}>BUSD</option>
                            </Input>
                            <Button disabled={!this.state.isConnectWallet}
                                    onClick={() => this.withdrawToken()}>Withdraw</Button>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Transfer admin:</CardTitle>
                            <Input type="string" name="transferAdmin" value={this.state.transferAdmin}
                                   onChange={(e) => this.handleChange(e)}/>
                            <Button disabled={!this.state.isConnectWallet}
                                    onClick={() => this.transferAdmin()}>Transfer</Button>
                        </Card>
                        <Card body>
                            <CardTitle tag="h3">Whitelist:</CardTitle>
                            <Input type="string" name="whitelist" value={this.state.whitelist}
                                   onChange={(e) => this.handleChange(e)}/>
                            <div>
                                <Button disabled={!this.state.isConnectWallet}
                                        onClick={() => this.addWhiteList()}>Add</Button>
                                <Button disabled={!this.state.isConnectWallet}
                                        onClick={() => this.removeWhiteList()}>Remove</Button>
                            </div>
                        </Card>
                    </Col>
                </Row>
                <p>
                    <Button onClick={() => this.showWhitelist()}>Hide/show whitelist</Button>
                </p>
                <Row style={this.state.isShowWhitelist ? {} : {display: 'none'}}>
                    <Col md="6">
                        <h3>Whitelist contract1: {this.state.whiteListResult.length}</h3>
                        <p>Owner: {this.state.ownerContract1}</p>
                        <Row>
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
                                    {this.state.whiteListResult.map((e, index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e.time.toString()}</td>
                                        <td>{e.address}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Row>
                    </Col>
                    <Col md="6">
                        <h3>Whitelist contract2: {this.state.whiteListResult2.length}</h3>
                        <p>Owner: {this.state.ownerContract2}</p>
                        <Row>
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
                                    {this.state.whiteListResult2.map((e, index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e.time.toString()}</td>
                                        <td>{e.address}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Row>
                    </Col>
                </Row>
                <p>
                    <Button onClick={() => this.showHistoryContribute()}>Hide/show history</Button>
                </p>
                <Row style={this.state.isShowHistoryContribute ? {} : {display: 'none'}}>
                    <Col md="6">
                        <Input type="select" name="filter1" value={this.state.filter1}
                               onChange={(e) => this.handleChangeFilter1(e)}>
                            <option value="ALL">ALL</option>
                            <option value="Jun">Jun</option>
                            <option value="Jul">Jul</option>
                            <option value="Aug">Aug</option>
                            <option value="Sep">Sep</option>
                            <option value="Oct">Oct</option>
                            <option value="Nov">Nov</option>
                            <option value="Dec">Dec</option>
                            <option value="Jan">Jan</option>
                            <option value="Feb">Feb</option>
                            <option value="Mar">Mar</option>
                            <option value="Apr">Apr</option>
                            <option value="May">May</option>
                        </Input>
                        <h3>History contract1: {this.state.historyFilter1.length}</h3>
                        <p>Owner: {this.state.ownerContract1}</p>
                        <Row>
                            <Card>
                                <Table>
                                    <thead align="right">
                                    <tr>
                                        <th>#</th>
                                        <th>Time</th>
                                        <th>Address</th>
                                        <th>BUSD</th>
                                        <th>BIC</th>
                                    </tr>
                                    <tr>
                                        <th></th>
                                        <th></th>
                                        <th></th>
                                        <th align="right">{this.state.sumBUSD1.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</th>
                                        <th align="right">{this.state.sumBIC1.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</th>
                                    </tr>
                                    </thead>
                                    <tbody align="right">
                                    {this.state.historyFilter1.map((e, index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e.time.toString()}</td>
                                        <td>{e.buyer}</td>
                                        <td align="right">{e.busd.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</td>
                                        <td align="right">{e.bic.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Row>
                    </Col>
                    <Col md="6">
                        <Input type="select" name="filter2" value={this.state.filter2}
                               onChange={(e) => this.handleChangeFilter2(e)}>
                            <option value="ALL">ALL</option>
                            <option value="Jun">Jun</option>
                            <option value="Jul">Jul</option>
                            <option value="Aug">Aug</option>
                            <option value="Sep">Sep</option>
                            <option value="Oct">Oct</option>
                            <option value="Nov">Nov</option>
                            <option value="Dec">Dec</option>
                            <option value="Jan">Jan</option>
                            <option value="Feb">Feb</option>
                            <option value="Mar">Mar</option>
                            <option value="Apr">Apr</option>
                            <option value="May">May</option>
                        </Input>
                        <h3>History contract2: {this.state.historyFilter2.length}</h3>
                        <p>Owner: {this.state.ownerContract2}</p>
                        <Row>
                            <Card>
                                <Table>
                                    <thead align="right">
                                    <tr>
                                        <th>#</th>
                                        <th>Time</th>
                                        <th>Address</th>
                                        <th>BUSD</th>
                                        <th>BIC</th>
                                    </tr>
                                    <tr>
                                        <th></th>
                                        <th></th>
                                        <th></th>
                                        <th align="right">{this.state.sumBUSD2.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</th>
                                        <th align="right">{this.state.sumBIC2.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</th>
                                    </tr>
                                    </thead>
                                    <tbody align="right">
                                    {this.state.historyFilter2.map((e, index) => <tr>
                                        <th key={'address' + index}>{index + 1}</th>
                                        <td>{e.time.toString()}</td>
                                        <td>{e.buyer}</td>
                                        <td>{e.busd.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</td>
                                        <td>{e.bic.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}</td>
                                    </tr>)}
                                    </tbody>
                                </Table>
                            </Card>
                        </Row>
                    </Col>
                </Row>

            </div>
        )
    }
}

export default App;
