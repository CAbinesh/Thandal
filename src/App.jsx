import { Route, Routes } from "react-router-dom";
import "./index.css";
import Mainpg from "./Mainpg";
function App() {
  
  return (
    <Routes>
      <Route path="/" element={<Mainpg />} />
    </Routes>
  );
}
export default App;
