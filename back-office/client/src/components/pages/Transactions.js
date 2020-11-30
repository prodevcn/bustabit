/* eslint-disable react/no-typos */
import React, { Component, Fragment } from "react";
import Navbar from "../partials/Navbar";
import Sidebar from "../partials/Sidebar";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faList} from "@fortawesome/free-solid-svg-icons/faList";
import ReactDatatable from '@ashvin27/react-datatable';
import PropTypes from "prop-types";
import {connect} from "react-redux";
import axios from "axios";
import {faArrowUp, faArrowDown} from "@fortawesome/free-solid-svg-icons";
import { toast, ToastContainer} from "react-toastify";

export default class Transactions extends Component {

    constructor(props) {
        super(props);

        this.columns = [
            {
                key: "user_id",
                text: "User ID",
                className: "name",
                align: "left",
                sortable: true,
            },
            {
                key: "username",
                text: "Username",
                className: "name",
                align: "left",
                sortable: true,
            },
            {
                key: "coin_code",
                text: "Coin",
                className: "coin",
                align: "left",
                sortable: true
            },
            {
                key: "amount",
                text: "Amount",
                className: "amount",
                align: "left",
                sortable: true
            },
            {
                key: "transaction_txid",
                text: "Transaction ID",
                className: "txid",
                align: "left",
                sortable: true
            },
            {
                key: "transaction_type",
                text: "Transaction Type",
                className: "type",
                align: "left",
                sortable: true
            },
            {
                key: "created",
                text: "Create Date",
                className: "date",
                align: "left",
                sortable: true
            },
            {
                key: "to_address",
                text: "Address",
                className: "address",
                align: "left",
                sortable: true
            },
            {
                key: "action",
                text: "Action",
                className: "action",
                width: 100,
                align: "left",
                sortable: false,
                cell: record => {
                    return (
                        <Fragment>
                            <button
                                className="btn btn-danger btn-sm"
                                onClick={() => this.deleteRecord(record)}>
                                <i className="fa fa-trash"></i>
                            </button>
                        </Fragment>
                    );
                }
            }
        ];

        this.config = {
            page_size: 10,
            length_menu: [ 10, 20, 50 ],
            filename: "Users",
            no_data_text: 'No user found!',
            button: {
                excel: true,
                print: true,
                csv: true
            },
            language: {
                length_menu: "Show _MENU_ result per page",
                filter: "Filter in records...",
                info: "Showing _START_ to _END_ of _TOTAL_ records",
                pagination: {
                    first: "First",
                    previous: "Previous",
                    next: "Next",
                    last: "Last"
                }
            },
            show_length_menu: true,
            show_filter: true,
            show_pagination: true,
            show_info: true,
        };

        this.state = {
            category: 'deposit',
            deposit_records: [],
            withdraw_records: [],
            records: [],
            
        };

        this.state = {
            currentRecord: {
                id: '',
                name: '',
                email: '',
                password: '',
                password2: '',
            },
        };

        this.getData = this.getData.bind(this);
    }

    componentDidMount() {
        console.log(this.state.category);
        this.getData();
    };

    componentWillReceiveProps(nextProps) {
        this.getData()
    }

    getData() {
        axios
            .post("/api/transaction/transaction-data")
            .then(res => {
                var deposits = [];
                var withdraws = [];
                for (let i=0; i < res.data.length; i++){
                    if (res.data[i]['transaction_type'] === 'deposit') {
                        deposits.push(res.data[i]);
                    } else {
                        withdraws.push(res.data[i]);
                    }
                }
                this.setState({ deposit_records: deposits, withdraw_records: withdraws});
            })
            .catch()
    }

    editRecord(record) {
        this.setState({ currentRecord: record});
    }

    deleteRecord(record) {
        axios
            .post("/api/transaction/transaction-delete", {id: record.id})
            .then(res => {
                if (res.status === 200) {
                   toast(res.data.message, {
                       position: toast.POSITION.TOP_CENTER,
                   })
                }
            })
            .catch();
        this.getData();
    }

    pageChange(pageData) {
        console.log("OnPageChange", pageData);
    }

    render() {
        return (
            <div>
                <Navbar/>
                <div className="d-flex" id="wrapper">
                    <Sidebar/>
                    <div id="page-content-wrapper">
                        <div className="container-fluid">
                            <button className="btn btn-link mt-3" id="menu-toggle" data-target="#sidebar-wrapper"><FontAwesomeIcon icon={faList}/></button>
                            <button className="btn btn-outline-primary float-right mt-3 mr-2" onClick={() => {this.setState({category: 'withdraw'})}}><FontAwesomeIcon icon={faArrowDown}/> Withdraw</button>
                            <button className="btn btn-outline-primary float-right mt-3 mr-2" onClick={() => {this.setState({category: 'deposit'})}}><FontAwesomeIcon icon={faArrowUp}/> Deposit</button>    
                            <h1 className="mt-2 text-primary">Transaction List</h1>
                            <ReactDatatable
                                config={this.config}
                                records={this.state.category === 'deposit' ? this.state.deposit_records : this.state.withdraw_records}
                                columns={this.columns}
                                onPageChange={this.pageChange.bind(this)}
                            />
                        </div>
                    </div>
                    <ToastContainer/>
                </div>
            </div>
        );
    }

}

// Transactions.propTypes = {
//     auth: PropTypes.object.isRequired,
// };

// const mapStateToProps = state => ({
//     auth: state.auth,
//     records: state.records
// });

// export default connect(
//     mapStateToProps
// )(Transactions);
