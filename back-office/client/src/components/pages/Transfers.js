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
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import { toast, ToastContainer} from "react-toastify";

export default class Transfers extends Component {

    constructor(props) {
        super(props);

        this.columns = [
            {
                key: "id",
                text: "Id",
                className: "uuid",
                align: "left",
                sortable: true,
            },
            {
                key: "from_user_id",
                text: "From User ID",
                className: "uid",
                align: "left",
                sortable: true,
            },
            {
                key: "from_user_name",
                text: "From Name",
                className: "name",
                align: "left",
                sortable: true,
            },
            {
                key: "to_user_id",
                text: "To User ID",
                className: "uid",
                align: "left",
                sortable: true,
            },
            {
                key: "from_user_name",
                text: "To Name",
                className: "name",
                align: "left",
                sortable: true,
            },
            {
                key: "amount",
                text: "Amount",
                className: "amount",
                align: "left",
                sortable: true
            },
            {
                key: "created",
                text: "Created",
                className: "date",
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
            filename: "Transfers",
            no_data_text: 'No transfer found!',
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
            records: []
        };

        this.state = {
            currentRecord: {
                id: '',
                name: '',
                email: '',
                password: '',
                password2: '',
            }
        };

        this.getData = this.getData.bind(this);
    }

    componentDidMount() {
        this.getData()
    };

    componentWillReceiveProps(nextProps) {
        this.getData()
    }

    getData() {
        axios
            .post("/api/transfer/transfer-data")
            .then(res => {
                this.setState({ records: res.data})
            })
            .catch()
    }

    editRecord(record) {
        this.setState({ currentRecord: record});
    }

    deleteRecord(record) {
        axios
            .post("/api/transfer/transfer-delete", {id: record.id})
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
                            <button className="btn btn-link mt-3" id="menu-toggle"><FontAwesomeIcon icon={faList}/></button>
                            <h1 className="mt-2 text-primary">Transfer History</h1>
                            <ReactDatatable
                                config={this.config}
                                records={this.state.records}
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

// Transfers.propTypes = {
//     auth: PropTypes.object.isRequired,
// };

// const mapStateToProps = state => ({
//     auth: state.auth,
//     records: state.records
// });

// export default connect(
//     mapStateToProps
// )(Transfers);
