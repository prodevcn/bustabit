import axios from "axios";
import {
    GET_ERRORS,
    CHAT_ADD,
    CHAT_UPDATE,
} from "./types";

export const addChat = (chatData, history) => dispatch => {
    axios
        .post("/api/chat/chat-add", chatData)
        .then(res =>
            dispatch({
                type: CHAT_ADD,
                payload: res,
            })
        ).catch(err =>
        dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        })
    );
};


export const updateChat = (chatData) => dispatch => {
    axios
        .post("/api/chat/chat-update", chatData)
        .then(res =>
            dispatch({
                type: CHAT_UPDATE,
                payload: res,
            })
        ).catch(err =>
        dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        })
    );
};
