import MainScreen from "./components/MainScreen";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/SignupScreen";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
      </Routes>
    </Router>
  );
};

export default App;
