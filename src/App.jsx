import MainScreen from "./components/MainScreen";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/SignupScreen";
import HomeScreen from "./components/HomeScreen";
import ProtectedRoute from "./components/ProtectedRoute";
import PlayBotScreen from "./components/PlayBotScreen";
import PlayRandomScreen from "./components/PlayRandomScreen";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/" element={<MainScreen />} />

        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomeScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play-bot"
          element={
            <ProtectedRoute>
              <PlayBotScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play-random"
          element={
            <ProtectedRoute>
              <PlayRandomScreen />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
