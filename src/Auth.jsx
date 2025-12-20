import React from "react";
// import axios from "axios";
import "./index.css";
import { FcGoogle } from "react-icons/fc";
import { LiaGithub } from "react-icons/lia";


function Auth() {
  const API_URL = import.meta.env.VITE_API_URL;
  return (
    <div className="loginPg">
      <h1 style={{ color: "white", fontSize: "40px" }}>Welcome !</h1>
      <div className="loginpg2">
        <button
          className="loginbtn"
          onClick={() => window.open(`${API_URL}/auth/google`, "_self")}
        >
          Continue with <FcGoogle />
        </button>
        <button
          className="loginbtn"
          onClick={() => window.open(`${API_URL}/auth/github`, "_self")}
        >
          Continue with <LiaGithub />
        </button>
       
      </div>
    </div>
  );
}

export default Auth;
