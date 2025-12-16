import React, { useEffect, useState } from "react";
import axios from "axios";
import "./index.css";

function Mainpg() {
  const [takenAmnt, setTakenAmnt] = useState("");
  const [cltnAmnt, setCltnAmnt] = useState("");
  const [datee, setDatee] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [searchDate, setSearchDate] = useState("");


  const API_URL=import.meta.env.VITE_API_URL
  // Fetch transactions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/transactions`);
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

  // Filter by date
const filteredTransactions = Array.isArray(transactions)
  ? transactions.filter(item => {
      if (!searchDate) return true;
      if (!item.datee) return false;

      const itemDate = new Date(item.datee)
        .toISOString()
        .slice(0, 10);

      return itemDate === searchDate;
    })
  : [];


  return (
    <div className="Layer0">
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
          <button type="submit">Submit</button>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Mainpg;
