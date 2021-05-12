import React from 'react';
import Web3 from "web3";
import IDOAbi from "./abi/IDO.json";
import {Col, Row, Card, CardTitle, Button, Input} from 'reactstrap';

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            web3: null,
            isConnectWallet: false,
            buyAmount: 0,
            rateInput: 0,
            rateOutput: 0,
            bicAddress: null,
            busdAddress: null,
            withdrawToken: 'BIC',
            transferAdmin: null,
            adminAddress: null
        }
    }
    componentDidMount() {
        this.syncData()
    }

    connectWithMetamask() {
        if(window.ethereum) {
            this.setState({
                web3: new Web3(window.ethereum),
                isConnectWallet: true
            }, async function () {
                try {
                    await window.ethereum.request({ method: 'eth_requestAccounts' })
                } catch (e) {
                    alert(`Something went wrong?\n ${e.message}`)
                }
            })
        } else alert('You need to have metamask first!')
    }

    async syncData() {
        const web3 = new Web3(process.env.REACT_APP_BSC_ENDPOINT)
        const contract = new web3.eth.Contract(IDOAbi, process.env.REACT_APP_IDO_CONTRACT)
        const bicAddr = await contract.methods.bicToken().call()
        const busdAddr = await contract.methods.busdToken().call()
        const rateInput = await contract.methods.input().call()
        const rateOutput = await contract.methods.output().call()
        const adminAddr = await contract.methods.owner().call()
        this.setState({
            bicAddress: bicAddr,
            busdAddress: busdAddr,
            adminAddress: adminAddr,
            rateInput: rateInput,
            rateOutput: rateOutput,
        })
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
                            <Input type="number"/>
                            <Button disabled={!this.state.isConnectWallet}>Buy</Button>
                        </Card>
                    </Col>
                    <Col md="2">
                        <Card body>
                            <CardTitle tag="h3">Receive:</CardTitle>
                            <p>1 BIC</p>
                        </Card>
                    </Col>
                </Row>
                <Row>
                    <h2>Admin:</h2><p>{this.state.adminAddress}</p>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Update price (current 1BUSD = {this.state.rateOutput/this.state.rateInput || 0}BIC):</CardTitle>
                            <Input type="number" placeholder="BUSD Rate" value={this.state.rateInput}/>
                            <Input type="number" placeholder="BIC Rate"  value={this.state.rateOutput}/>
                            <Button disabled={!this.state.isConnectWallet}>Change</Button>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Withdraw token:</CardTitle>
                            <Input type="select">
                                <option value="0x">BIC</option>
                                <option value="0x">BUSD</option>
                            </Input>
                            <Button disabled={!this.state.isConnectWallet}>Withdraw</Button>
                        </Card>
                    </Col>
                    <Col md="4">
                        <Card body>
                            <CardTitle tag="h3">Transfer admin:</CardTitle>
                            <Input type="string"/>
                            <Button disabled={!this.state.isConnectWallet}>Buy</Button>
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }
}

export default App;
