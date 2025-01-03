import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { supabase } from "../supabaseClient";
import validator from "validator";
import "./SignupScreen.css";

const SignupScreen = () => {
  const navigate = useNavigate();

  /****** STATE MANAGEMENT ******/
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  /****** LOGIC ******/
  const handleSignup = async (e) => {
    e.preventDefault();
  
    // Validate inputs
    if (!validator.isEmail(email)) {
      console.error("Invalid email format");
      alert("Invalid email format");
      return;
    }
  
    if (!validator.isAlphanumeric(username)) {
      console.error("Username should contain only letters and numbers");
      alert("Username should only contain letters and numbers");
      return;
    }
  
    if (!isValidPassword(password)) {
      console.error("Password is not valid");
      alert("Password does not meet requirements");
      return;
    }
  
    try {
      // Step 1: Sign up the user
      const { data: user, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
  
      if (signupError) throw signupError;

      const userId = user.user?.id; // Get user ID
      if (!userId) {
        throw new Error("User signup failed.");
      }
  
      console.log("User ID:", userId);
  
      // Step 2: Insert a profile for the user
      const { error: profileError } = await supabase.from("profiles").insert([
        { id: userId, username, wins: 0, losses: 0, ties: 0 },
      ]);
  
      if (profileError) throw profileError;
  
      alert("Signup successful!");
      console.log("User and profile created successfully");
  
      // Navigate to the login screen
      navigate("/login");
    } catch (error) {
      console.error("Error signing up user:", error.message);
      alert(`Error signing up: ${error.message}`);
    }
  };
  
  const isValidPassword = (password) => {
    return password.length >= 6;
  };

  /*****ANIMATION******/
  const handleBack = () => {
    // Animate the current screen out to the left
    gsap.to(".signup-screen-container", {
      x: "-100%",
      opacity: 0,
      duration: 1.0,
      ease: "power2.inOut",
      onComplete: () => {
        navigate("/"); // Navigate back to MainScreen
      },
    });
  };

  useEffect(() => {
    // GSAP animation for the signup page entering
    gsap.fromTo(
      ".signup-screen-container",
      { x: "-100%", opacity: 0 },
      { x: "0%", opacity: 1, duration: 1.0, ease: "power2.out" }
    );
  }, []);

  return (
    <div className="outer-container">
      <div className="signup-screen-container">
        <button className="back-button" onClick={handleBack}>
          &#8592; Back
        </button>
        <h1 className="signup-title">Sign Up</h1>
        <form className="signup-form" onSubmit={handleSignup}>
          <label className="signup-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="signup-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="signup-label" htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Create a Username"
            className="signup-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <label className="signup-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Create a password"
            className="signup-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="signup-button-signup">
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupScreen;
