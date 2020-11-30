import axios from "axios";
import setAuthToken from "../utils/setAuthToken";
import jwt_decode from "jwt-decode";
import {
    GET_ERRORS,
    SET_CURRENT_USER,
    USER_LOADING
} from "./types";

export const registerUser = (userData, history) => dispatch => {
    axios
        .post("/api/user/register", userData)
        .then((res) => {
            console.log(res);
            if (res.data.status === 'success') {
                history.push("/login");
            } else {
                dispatch({
                    type: GET_ERRORS,
                    payload: res.status
                });
            }
        })
        .catch(err =>
            dispatch({
                type: GET_ERRORS,
                payload: err.response.data
            })
        );
};

export const loginUser = userData => dispatch => {
    axios
        .post("/api/user/login", userData)
        .then((res) => {
            // console.log('this is res', res);
            const { token } = res.data;
            localStorage.setItem("jwtToken", token);
            setAuthToken(token);
            const decoded = jwt_decode(token);
            dispatch(setCurrentUser(decoded));
        })
        .catch((err) => {
            console.error(err)
            dispatch({
                type: GET_ERRORS,
                payload: err.response.data
            })
            }
        );
};

export const setCurrentUser = decoded => {
    return {
        type: SET_CURRENT_USER,
        payload: decoded
    };
};

export const setUserLoading = () => {
    return {
        type: USER_LOADING
    };
};

export const logoutUser = () => dispatch => {
    localStorage.removeItem("jwtToken");
    setAuthToken(false);
    dispatch(setCurrentUser({}));
};
