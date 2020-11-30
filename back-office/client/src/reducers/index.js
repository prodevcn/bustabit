import { combineReducers } from "redux";
import authReducer from "./authReducers";
import errorReducer from "./errorReducers";
import manageReducer from "./manageReducers";
export default combineReducers({
    auth: authReducer,
    errors: errorReducer,
    manage: manageReducer
});