import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import "./SignupScreen.css";

const SignupScreen = () => {
  const navigate = useNavigate();

//   const handleSignup = async (event) => {
//     event.preventDefault(); // Prevent default form submission
//     const email = event.target.email.value;
//     const username = event.target.username.value;
//     const password = event.target.password.value;
  
//     try {
//       const user = await Auth.signUp({
//         username: email,
//         password,
//         attributes: {
//           email, // Cognito requires email
//           preferred_username: username, // Optional
//         },
//       });
//       console.log("Signup successful:", user);
//       alert("Signup successful! Please check your email for verification.");
//     } catch (error) {
//       console.error("Signup error:", error);
//       alert(`Signup failed: ${error.message}`);
//     }
//   };

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
        <form className="signup-form">
          <label className="signup-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            className="signup-input"
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
