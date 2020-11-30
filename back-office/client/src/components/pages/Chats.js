/* eslint-disable react/no-typos */
import React, { Component, Fragment } from "react";
import Navbar from "../partials/Navbar";
import Sidebar from "../partials/Sidebar";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faList} from "@fortawesome/free-solid-svg-icons/faList";
import ReactDatatable from '@ashvin27/react-datatable';
// import PropTypes from "prop-types";
// import {connect} from "react-redux";
import axios from "axios";
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import { toast, ToastContainer} from "react-toastify";
import ChatAddModal from "../partials/ChatAddModal";

export default class Chats extends Component {

    constructor(props) {
        super(props);

        this.columns = [
            {
                key: "id",
                text: "Id",
                className: "id",
                align: "left",
                sortable: true,
            },
            {
                key: "user_id",
                text: "User ID",
                className: "uid",
                align: "left",
                sortable: true,
            },
            {
                key: "username",
                text: "Name",
                className: "name",
                align: "left",
                sortable: true,
            },
            {
                key: "message",
                text: "Message",
                className: "message",
                align: "left",
                sortable: false
            },
            {
                key: "created",
                text: "Date",
                className: "date",
                align: "left",
                sortable: true
            },
            {
                key: "is_bot",
                text: "Bot Check",
                className: "password",
                align: "left",
                sortable: false
            },
            {
                key: "channel",
                text: "Channel",
                className: "chanel",
                align: "left",
                sortable: false
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
                csv: false
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
            },
            openDlg: 'false',
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
            .post("/api/chat/chat-data")
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
            .post("/api/chat/chat-delete", {id: record.id})
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
                    {this.state.openDlg === 'true' && (<ChatAddModal />)}
                    <ChatAddModal />
                    <div id="page-content-wrapper">
                        <div className="container-fluid">
                            <button className="btn btn-link mt-3" id="menu-toggle"><FontAwesomeIcon icon={faList}/></button>
                            {this.state.openDlg}
        {/*<button className="btn btn-outline-primary float-right mt-3 mr-2" onClick={() => {this.setState({openDlg: true})}}><FontAwesomeIcon icon={faPlus}/> Add Message</button> */}
                            <h1 className="mt-2 text-primary">Chat List</h1>
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

// Chats.propTypes = {
//     auth: PropTypes.object.isRequired,
// };

// const mapStateToProps = state => ({
//     auth: state.auth,
//     records: state.records
// });

// export default connect(
//     mapStateToProps
// )(Chats);
