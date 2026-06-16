import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import AdminDashboard from "./components/admin/AdminDashboard";
import VotingPanel from "./components/VotingPanel";
import Results from "./components/Results";
import WalletButton from "./components/WalletButton";

function App() {
  const { wallet, isAdmin, voterStatus, registerAsVoter, loading } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-600">IT Club Election System</h1>
        <WalletButton />
      </header>

      <main className="max-w-6xl mx-auto">
        {!wallet ? (
          <div className="text-center p-20 bg-white rounded-lg shadow">
            <h2 className="text-xl mb-4 text-gray-700">Please connect your wallet to participate</h2>
            <p className="text-gray-500">Only verified students can cast votes.</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {/* Voter Registration Section */}
            {!isAdmin && !voterStatus.registered && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-blue-800 mb-2">Become a Voter</h2>
                <p className="text-blue-700 mb-4">You need to register yourself before the admin can verify you.</p>
                <button 
                  onClick={registerAsVoter}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? "Registering..." : "Register Now"}
                </button>
              </div>
            )}

            {/* Verification Status */}
            {!isAdmin && voterStatus.registered && !voterStatus.verified && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-yellow-800 mb-2">Pending Verification</h2>
                <p className="text-yellow-700">You are registered! Please wait for the admin to verify your wallet address.</p>
              </div>
            )}

            {/* Only show voting panel if verified */}
            {voterStatus.verified && !voterStatus.hasVoted && <VotingPanel />}
            
            {voterStatus.hasVoted && (
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg shadow">
                <h2 className="text-xl font-bold text-green-800 mb-2">Vote Cast!</h2>
                <p className="text-green-700">Thank you for participating in the IT Club Election.</p>
              </div>
            )}

            <Results />
            {isAdmin && <AdminDashboard />}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;