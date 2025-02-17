import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PropTypes from "prop-types";

const ProtectedRoute = ({ children = null}) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login"); // Redirect to login if not authenticated
      } else {
        setIsAuthenticated(true); // User is authenticated
      }
      setLoading(false); // Stop showing loading indicator
    };

    checkSession();
  }, [navigate]);

  if (loading) {
    return <div className="loading-screen">Loading...</div>; 
  }

  return isAuthenticated ? children : null; // Render children if authenticated
};

ProtectedRoute.propTypes = {
  children: PropTypes.node,
};

export default ProtectedRoute;
