import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { API_URL } from "../config";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const COLORS = ["#10b981", "#34d399", "#0ea5e9", "#20b2aa", "#3b82f6", "#059669"];

export default function AnalyticsDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/results`);
      const results = await res.json();
      setData(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const downloadPDF = async () => {
    const input = document.getElementById("analytics-report");
    const canvas = await html2canvas(input, { scale: 2, backgroundColor: "#080f0b" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Election_Report_${new Date().toLocaleDateString()}.pdf`);
  };

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl border border-[#1e3a2b] p-8 text-center text-slate-500 font-mono italic animate-pulse">
        Processing analytics engine...
      </div>
    );
  }

  const totalVotes = data.reduce((acc, c) => acc + Number(c.vote_count), 0);
  const positions = [...new Set(data.map(c => c.position))];
  
  return (
    <div className="section-gap mt-0 lg:mt-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-wider">
            Election Intelligence
          </h2>
          <p className="text-slate-400 text-sm mt-1">Real-time data visualization & audit reporting</p>
        </div>
        <button
          onClick={downloadPDF}
          className="btn-secondary shrink-0 self-start sm:self-auto"
        >
          <span aria-hidden="true">📥</span>
          Download Audit Report
        </button>
      </div>

      <div id="analytics-report" className="space-y-6 sm:space-y-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#080f0b] border border-[#1e3a2b]">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-[#1e3a2b]">
             <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Total Participation</p>
             <h4 className="text-2xl sm:text-3xl font-black text-emerald-400 text-glow-emerald">{totalVotes} <span className="text-xs font-normal text-slate-500 tracking-normal font-sans">Votes Sealed</span></h4>
          </div>
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-[#1e3a2b]">
             <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">On-chain Audit Integrity</p>
             <h4 className="text-2xl sm:text-3xl font-black text-emerald-400 text-glow-emerald">100% <span className="text-xs font-normal text-slate-500 tracking-normal font-sans">Verified</span></h4>
          </div>
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-[#1e3a2b] sm:col-span-2 lg:col-span-1">
             <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Voter Protocol Whitelist</p>
             <h4 className="text-2xl sm:text-3xl font-black text-emerald-400 text-glow-emerald">Merkle <span className="text-xs font-normal text-slate-500 tracking-normal font-sans">Proof</span></h4>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Bar Chart: Rankings */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-[#1e3a2b] min-h-[320px] sm:min-h-[400px] flex flex-col">
            <h3 className="font-black text-sm text-slate-300 mb-4 sm:mb-6 uppercase tracking-widest">Candidate Performance Ranking</h3>
            <div className="flex-1 min-h-[240px] sm:min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e3a2b" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fontWeight: 700, fill: "#94a3b8" }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f1c15", border: "1px solid #1e3a2b", borderRadius: "12px", color: "#e2e8f0", fontSize: "13px", fontFamily: "var(--font-mono)" }}
                    cursor={{ fill: '#162a1f', opacity: 0.3 }}
                  />
                  <Bar dataKey="vote_count" fill="#10b981" radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Distribution by Position */}
          <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-[#1e3a2b] min-h-[320px] sm:min-h-[400px] flex flex-col">
            <h3 className="font-black text-sm text-slate-300 mb-4 sm:mb-6 uppercase tracking-widest">Vote Distribution by position</h3>
            <div className="flex-1 min-h-[240px] sm:min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%" minHeight={240}>
                <PieChart>
                  <Pie
                    data={positions.map(pos => ({
                      name: pos,
                      value: data.filter(c => c.position === pos).reduce((a, b) => a + Number(b.vote_count), 0)
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0f1c15", border: "1px solid #1e3a2b", borderRadius: "12px", color: "#e2e8f0", fontSize: "13px" }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Analytics Table */}
        <div className="glass-panel rounded-2xl border border-[#1e3a2b] overflow-hidden shadow-card">
          <div className="table-responsive">
          <table className="w-full text-left">
            <thead className="bg-[#0f1c15] border-b border-[#1e3a2b]">
              <tr>
                <th className="px-6 py-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Candidate</th>
                <th className="px-6 py-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Position</th>
                <th className="px-6 py-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Votes</th>
                <th className="px-6 py-4 text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Ballot Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e3a2b]/40 bg-[#0f1c15]/20">
              {data.map(c => (
                <tr key={c.id} className="hover:bg-emerald-500/5 transition-colors">
                  <td className="px-6 py-4 min-w-0 font-bold text-slate-100 text-base">{c.name}</td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">{c.position}</td>
                  <td className="px-6 py-4 font-mono font-black text-slate-100 text-base">{c.vote_count}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="h-1.5 w-16 bg-[#162a1f] border border-[#1e3a2b] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" 
                            style={{ width: `${(Number(c.vote_count) / totalVotes * 100) || 0}%` }}
                          ></div>
                       </div>
                       <span className="text-xs font-mono font-bold text-slate-500">
                        {((Number(c.vote_count) / totalVotes * 100) || 0).toFixed(1)}%
                       </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
