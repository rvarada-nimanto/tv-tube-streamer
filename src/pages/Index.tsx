import { Navigate } from "react-router-dom";

// The dashboard sends signed-out visitors on to /auth.
const Index = () => <Navigate to="/dashboard" replace />;

export default Index;
