/* eslint-disable react/no-typos */
import React, { Component } from "react";
import { Link, withRouter  } from "react-router-dom";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { registerUser } from "../../actions/authActions";
import classnames from "classnames";

class Register extends Component {

    constructor() {
        super();
        this.state = {
            name: "",
            email: "",
            password: "",
            password2: "",
            errors: {}
        };
    }

    componentDidMount() {
        if (this.props.auth.isAuthenticated) {
            this.props.history.push("/dashboard");
        }
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.errors) {
            this.setState({
                errors: nextProps.errors
            });
        }
    }

    onChange = e => {
        this.setState({ [e.target.id]: e.target.value });
    };

    onSubmit = e => {
        e.preventDefault();
        const newUser = {
            name: this.state.name,
            email: this.state.email,
            password: this.state.password,
            password2: this.state.password2
        };
        this.props.registerUser(newUser, this.props.history);
    };

    render() {
        const { errors } = this.state;
        return (
            <div className="container">
                <div className="row">
                    <div className="col-md-6 mx-auto mt-5 card shadow-lg">
                        <div className="card-body p-1">
                            <Link to="/" className="btn-flat waves-effect">
                            <i className="material-icons left">keyboard_backspace</i> Back to home </Link>
                            <div className="col-md-12" >
                                <h4>
                                    <b>Register</b> below
                                </h4>
                                <p className="grey-text text-darken-1">
                                    Already have an account? <Link to="/login">Log in</Link>
                                </p>
                            </div>
                            <form noValidate onSubmit={this.onSubmit} className="white">
                                <div className="input-field col s12">
                                    <label htmlFor="name">Name</label>
                                    <span className="red-text">{errors.name}</span>
                                    <input
                                        onChange={this.onChange}
                                        value={this.state.name}
                                        id="name"
                                        type="text"
                                        error={errors.name}
                                        className={classnames("form-control", {
                                            invalid: errors.name
                                        })}
                                    />
                                    
                                </div>
                                <div className="input-field col s12">
                                    <label htmlFor="email">Email</label>
                                    <span className="red-text">{errors.email}</span>
                                    <input
                                        onChange={this.onChange}
                                        value={this.state.email}
                                        error={errors.email}
                                        id="email"
                                        type="email"
                                        className={classnames("form-control", {
                                            invalid: errors.email
                                        })}
                                    />
                                    
                                </div>
                                <div className="input-field col s12">
                                    <label htmlFor="password">Password</label>
                                    <span className="red-text">{errors.password}</span>
                                    <input
                                        onChange={this.onChange}
                                        value={this.state.password}
                                        error={errors.password}
                                        id="password"
                                        type="password"
                                        className={classnames("form-control", {
                                            invalid: errors.password
                                        })}
                                    />
                                    
                                </div>
                                <div className="input-field col s12">
                                    <label htmlFor="password2">Confirm Password</label>
                                    <span className="red-text">{errors.password2}</span>
                                    <input
                                        onChange={this.onChange}
                                        value={this.state.password2}
                                        id="password2"
                                        type="password"
                                        className={classnames("form-control", {
                                            invalid: errors.password2
                                        })}
                                    />
                                    
                                </div>
                                <div className="text-center pb-0 mt-2">
                                    <button
                                        style={{
                                            width: "150px",
                                            borderRadius: "3px",
                                            letterSpacing: "1.5px",
                                            marginTop: "1rem"
                                        }}
                                        type="submit"
                                        className="btn btn-large btn-primary mt-4">
                                        SignUp
                                    </button>
                                </div>
                            </form>
                
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

Register.propTypes = {
    registerUser: PropTypes.func.isRequired,
    auth: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
    auth: state.auth,
    errors: state.errors
});

export default connect(
    mapStateToProps,
    { registerUser }
)(withRouter(Register));