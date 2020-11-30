import {
    // SET_CURRENT_USER,
    CHAT_ADD,
    CHAT_LOADING,
    CHAT_UPDATE
} from "../actions/types";
// const isEmpty = require("is-empty");
const initialState = {
    // isAuthenticated: false,
    chat: {},
    loading: false,
};
export default function(state = initialState, action) {
    switch (action.type) {
        case CHAT_ADD:
            return {
                chat: action.payload
            };
        case CHAT_UPDATE:
            return {
                // isAuthenticated: !isEmpty(action.payload),
                chat: action.payload,
            };
        // case SET_CURRENT_USER:
        //     return {
        //         ...state,
        //         isAuthenticated: !isEmpty(action.payload),
        //         user: action.payload
        //     };
        case CHAT_LOADING:
            return {
                ...state,
                loading: true
            };
        default:
            return state;
    }
}
