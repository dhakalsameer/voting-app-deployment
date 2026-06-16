import ElectionControl from "./ElectionControl";
import RegisterCandidate from "./RegisterCandidate";
import VerifyVoter from "./VerifyVoter";

export default function AdminDashboard() {
  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8">
      <h2 className="text-2xl font-bold mb-6 text-red-600">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div className="p-4 border border-gray-200 rounded-lg">
            <ElectionControl />
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <VerifyVoter />
          </div>
        </section>

        <section className="p-4 border border-gray-200 rounded-lg">
          <RegisterCandidate />
        </section>
      </div>
    </div>
  );
}
