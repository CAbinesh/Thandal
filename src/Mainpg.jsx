import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import "./index.css";
import { ThumbsDown } from "lucide-react";
import { LogOut } from "lucide-react";
import { AuthContext } from "./App";
import { useNavigate } from "react-router-dom";

function Mainpg() {
  const [takenAmnt, setTakenAmnt] = useState("");
  const [cltnAmnt, setCltnAmnt] = useState("");
  const [datee, setDatee] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [searchDate, setSearchDate] = useState("");
  const{setUser}=useContext(AuthContext);
const navigate=useNavigate(); 
  const API_URL = import.meta.env.VITE_API_URL;
  // Fetch transactions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/transactions`,{
  withCredentials: true,
});
        setTransactions(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [API_URL]);

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/transactions`, {
        takenAmnt,
        cltnAmnt,
        datee, // ✅ correct field
      });

      setTransactions((prev) => [res.data, ...prev]);

      setTakenAmnt("");
      setCltnAmnt("");
      setDatee("");
    } catch (error) {
      console.error("Insert error:", error);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure to delete ❌")) return;
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      setTransactions((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error("Delete failed", error);
    }
  };
  const handleLogout=async()=>{
    try {
      await fetch(`${API_URL}/logout`,{
        method:"POST",
        credentials:"include"
      });
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }
  // Filter by date
  const filteredTransactions = Array.isArray(transactions)
    ? transactions.filter((item) => {
        if (!searchDate) return true;
        if (!item.datee) return false;

        const itemDate = new Date(item.datee).toISOString().slice(0, 10);

        return itemDate === searchDate;
      })
    : [];

  return (
    <div className="Layer0">
      <button className="logout" onClick={()=>handleLogout()}>
        <LogOut className="Logout" size={20} strokeWidth={2} color="red" />
        
      </button>
      <div className="h1class">
        <h1>த ண் ட ல்</h1>
      </div>

      <div className="Layer1">
        <form onSubmit={handleSubmit}>
          <input
            className="input"
            type="number"
            value={takenAmnt}
            onChange={(e) => setTakenAmnt(e.target.value)}
            required
            placeholder="எடுத்துச்சென்றது"
          />
          <input
            className="input"
            type="number"
            value={cltnAmnt}
            onChange={(e) => setCltnAmnt(e.target.value)}
            required
            placeholder="வரவு"
          />
          <input
            className="input"
            type="date"
            value={datee}
            onChange={(e) => setDatee(e.target.value)}
            required
          />
          <button className="btnsbt" type="submit">
            Submit
          </button>
        </form>
      </div>

      <div className="Layer2">
        <div className="searchbox">
          <label>Search by date: </label>
          <input
            className="input"
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
        </div>

        <div className="cardContainer">
          {transactions.length === 0 && (
            <p style={{ fontSize: "30px" }}>
              No transactions found{" "}
              <ThumbsDown size={30} strokeWidth={2} color="white" />{" "}
            </p>
          )}
          {filteredTransactions.map((item) => {
            const remain =
              (Number(item.cltnAmnt) || 0) - (Number(item.takenAmnt) || 0);

            return (
              <div key={item._id} className="layer2Card">
                <h4>{item.datee?.slice(0, 10)}</h4>
                <p>எடுத்துச்சென்றது: {item.takenAmnt}</p>
                <p>வரவு: {item.cltnAmnt}</p>
                <p className={remain >= 0 ? "positive" : "negative"}>
                  {remain}
                </p>
                <button
                  className="btndlt"
                  onClick={() => handleDelete(item._id)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24px"
                    viewBox="0 -960 960 960"
                    width="24px"
                    fill="#EA3323"
                  >
                    <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Mainpg;
