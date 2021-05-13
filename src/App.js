import React from 'react';
import Web3 from "web3";
import IDOAbi from "./abi/IDO.json";
import BEP20Abi from "./abi/BEP20.json";
import {Col, Row, Card, CardTitle, CardText, Button, Input} from 'reactstrap';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            web3: null,
            contract: null,
            isConnectWallet: false,
            buyAmount: 0,
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
            withdrawToken: 'BIC',
            transferAdmin: null,
            adminAddress: null,
            currentAddress: null
        }
    }
    componentDidMount() {
        this.syncStaticData().then(() => {
            this.syncContractBalance()
            this.syncUserBalance()
        })
        this.syncChangeableData()
    }

    connectWithMetamask() {
        if(window.ethereum) {
            this.setState({
                web3: new Web3(window.ethereum)
            }, async function () {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' })
                    const addresses = await this.state.web3.eth.getAccounts()
                    this.setState({
                        contract: new this.state.web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT),
                        isConnectWallet: true,
                        currentAddress: addresses[0]
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
        const bicContract = new web3.eth.Contract(BEP20Abi, this.state.bicAddress)
        const busdContract = new web3.eth.Contract(BEP20Abi, this.state.busdAddress)
        const _bicBalance = await bicContract.methods.balanceOf(process.env.REACT_APP_IDO_CONTRACT).call()
        const _busdBalance = await busdContract.methods.balanceOf(process.env.REACT_APP_IDO_CONTRACT).call()
        this.setState({
            bicBalance: _bicBalance,
            busdBalance: _busdBalance,
        })
    }

    async syncUserBalance() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const bicContract = new web3.eth.Contract(BEP20Abi, this.state.bicAddress)
        const busdContract = new web3.eth.Contract(BEP20Abi, this.state.busdAddress)
        const _bicBalance = await bicContract.methods.balanceOf(this.state.address).call()
        const _busdBalance = await busdContract.methods.balanceOf(this.state.address).call()
        this.setState({
            bicUser: _bicBalance,
            busdUser: _busdBalance,
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

    async buyBIC() {
        await this.state.contract.methods.buy(Web3.utils.toWei(this.state.buyAmount)).send({from: this.state.currentAddress})
        await this.syncContractBalance()
        await this.syncUserBalance()
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
                    <h2>User:</h2>
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
                            <p>{this.state.buyAmount * this.state.rateOutput / this.state.rateInput || 0} BIC</p>
                        </Card>
                    </Col>
                </Row>
                <Row>
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
                    </Col>
                </Row>
            </div>
        )
    }
}

export default App;
