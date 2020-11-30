import React from 'react'
import classnames from "classnames";
import { toast } from 'react-toastify';
import $ from 'jquery';
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css';

export default class ChatAddModal extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            message: "",
            errors: {},
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.errors) {
            this.setState({
                errors: nextProps.errors
            });
        }
        if (nextProps.manage !== undefined
            && nextProps.manage.chat !== undefined
            && nextProps.manage.chat.data !== undefined
            && nextProps.manage.chat.data.message !== undefined) {
            $('#chat-user-modal').modal('hide');
            toast(nextProps.mange.chat.data.message, {
                position: toast.POSITION.TOP_CENTER
            });
        }
    }

    onChange = e => {
        this.setState({ [e.target.id]: e.target.value });
    };

    onChatAdd = e => {
        e.preventDefault();
        const newChat = {
            name: this.state.name,
            email: this.state.email,
            password: this.state.password,
            password2: this.state.password2
        };
        (async () => {
            axios.post("/api/chat/chat-add", newChat)
            .then((res) => {
                console.log(res);
            }).catch((err) => {
                console.error(err);
            });
        })(); 
    };

    render() {
        const { errors } = this.state;
        return (
            <div>
                <div className="modal fade" id="add-chat-modal" data-reset="true">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h4 className="modal-title">Add Message</h4>
                                <button type="button" className="close" data-dismiss="modal">&times;</button>
                            </div>
                            <div className="modal-body">
                                <form noValidate onSubmit={this.onChatAdd} id="add-chat">
                                    <div className="row mt-2">
                                        <div className="col-md-3">
                                            <label htmlFor="password2">Message</label>
                                        </div>
                                        <div className="col-md-9">
                                            <textarea
                                                autoComplete={''}
                                                onChange={this.onChange}
                                                value={this.state.message}
                                                id="message"
                                                className={classnames("form-control", {
                                                    invalid: errors.message
                                                })}
                                            />
                                            <span className="text-danger">{errors.password2}</span>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                                <button
                                    form="add-chat"
                                    type="submit"
                                    className="btn btn-primary">
                                    Add Message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}