"use client";

import { useState, useEffect } from "react";
import { Users, Megaphone, Send, Mail, Briefcase, FileText, CheckCircle, BarChart2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import api from "../lib/api";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inboundReplies, setInboundReplies] = useState([]);
  const [inboundLoading, setInboundLoading] = useState(true);
  
  // Set default to current month
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  const fetchDashboard = () => {
    setLoading(true);
    api.get("/api/dashboard", { params: { startDate, endDate } }).then((res) => {
      setStats(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchDashboard();
    setInboundLoading(true);
    api.get("/api/messages/inbound")
      .then((res) => {
        setInboundReplies(Array.isArray(res.data) ? res.data.slice(0, 5) : []);
      })
      .catch((err) => {
        console.error("Failed to fetch inbound replies for dashboard:", err);
      })
      .finally(() => {
        setInboundLoading(false);
      });
  }, [startDate, endDate]);

  if (loading) {
    return <div className="page-container"><div className="loading-container"><div className="loading-spinner" /></div></div>;
  }

  const {
    totalLeads = 0,
    totalLists = 0,
    totalCampaigns = 0,
    totalMessagesSent = 0,
    totalMessagesReceived = 0,
    deliveryRate = "0.0",
    campaignStatus = { sent: 0, delivered: 0, read: 0, failed: 0 }
  } = stats || {};

  const totalInteractions = totalMessagesSent + totalMessagesReceived;
  const deliveryRateValue = parseFloat(deliveryRate);

  const totalSent = totalMessagesSent || 0;
  const sentCount = campaignStatus.sent || 0;
  const deliveredCount = campaignStatus.delivered || 0;
  const readCount = campaignStatus.read || 0;
  const failedCount = campaignStatus.failed || 0;

  const deliveredPct = totalSent > 0 ? Math.min(100, Math.round((deliveredCount / totalSent) * 100)) : 0;
  const readPct = totalSent > 0 ? Math.min(100, Math.round((readCount / totalSent) * 100)) : 0;

  const totalTracked = sentCount + deliveredCount + failedCount;
  let donutBackground = "#f1f5f9";
  if (totalTracked > 0) {
    const sPct = (sentCount / totalTracked) * 100;
    const dPct = (deliveredCount / totalTracked) * 100;
    donutBackground = `conic-gradient(#3b82f6 0% ${sPct}%, #10b981 ${sPct}% ${sPct + dPct}%, #f59e0b ${sPct + dPct}% 100%)`;
  }

  return (
    <div className="page-container" style={{ background: '#f5f7f9', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>Welcome back! 👋</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>Here's what's happening with your business today.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span role="img" aria-label="calendar">📅</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#333' }} 
            />
            <span style={{ color: '#94a3b8' }}>-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '13px', color: '#333' }} 
            />
          </div>
          <Link href="/campaigns/new" className="btn-primary" style={{ background: '#3b82f6', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, textDecoration: 'none' }}>
            + Quick Create
          </Link>
        </div>
      </div>

      {/* Top Cards Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {[
          { label: "TOTAL CONTACTS", value: totalLeads.toLocaleString(), sub: "All Time", icon: <Users size={20} color="#3b82f6" />, bg: "#eff6ff" },
          { label: "CONTACT LISTS", value: totalLists.toLocaleString(), sub: "All Time", icon: <Briefcase size={20} color="#8b5cf6" />, bg: "#f3e8ff" },
          { label: "TOTAL INTERACTIONS", value: totalInteractions.toLocaleString(), sub: "This Month", icon: <FileText size={20} color="#0f766e" />, bg: "#ccfbf1" },
          { label: "AVG DELIVERY", value: deliveryRate + "%", sub: "This Month", icon: <BarChart2 size={20} color="#16a34a" />, bg: "#dcfce7" }
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', letterSpacing: '0.5px' }}>{card.label}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {card.sub} <span style={{ fontSize: '10px' }}>▼</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>{card.value}</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Cards Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        {[
          { label: "CAMPAIGNS", value: totalCampaigns.toLocaleString(), sub: "Total Active", icon: <Megaphone size={20} color="#a855f7" />, bg: "#f3e8ff" },
          { label: "MESSAGES SENT", value: totalMessagesSent.toLocaleString(), sub: "All Time", icon: <Send size={20} color="#10b981" />, bg: "#d1fae5" },
          { label: "MESSAGES RECEIVED", value: totalMessagesReceived.toLocaleString(), sub: "All Time", icon: <Mail size={20} color="#3b82f6" />, bg: "#eff6ff" },
          { label: "DELIVERY RATE", value: deliveryRate + "%", sub: "Avg", icon: <CheckCircle size={20} color={deliveryRateValue < 90 ? "#ef4444" : "#f59e0b"} />, bg: "#fef3c7" }
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', letterSpacing: '0.5px' }}>{card.label}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {card.sub}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0f172a' }}>{card.value}</div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts / Bottom section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Real Message Delivery Funnel */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '16px' }}>Message Delivery Funnel</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                <span>Sent</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{sentCount.toLocaleString()} {totalSent > 0 ? '(100%)' : ''}</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: totalSent > 0 ? '100%' : '0%', height: '100%', background: '#3b82f6', borderRadius: '6px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                <span>Delivered</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{deliveredCount.toLocaleString()} {totalSent > 0 ? `(${deliveredPct}%)` : ''}</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: totalSent > 0 ? `${deliveredPct}%` : '0%', height: '100%', background: '#8b5cf6', borderRadius: '6px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                <span>Read</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{readCount.toLocaleString()} {totalSent > 0 ? `(${readPct}%)` : ''}</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: totalSent > 0 ? `${readPct}%` : '0%', height: '100%', background: '#10b981', borderRadius: '6px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Real Message Status (All Time) Donut Chart */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '24px', alignSelf: 'flex-start' }}>Message Status (All Time)</h3>
          
          <div
            style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: donutBackground,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
            }}
          >
            <div
              style={{
                width: '102px',
                height: '102px',
                borderRadius: '50%',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', letterSpacing: '0.04em' }}>TOTAL SENT</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{totalSent.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '24px', fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: totalTracked > 0 ? '#3b82f6' : '#cbd5e1', borderRadius: '50%' }} />
              Sent ({sentCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: totalTracked > 0 ? '#10b981' : '#cbd5e1', borderRadius: '50%' }} />
              Delivered ({deliveredCount})
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', background: totalTracked > 0 ? '#f59e0b' : '#cbd5e1', borderRadius: '50%' }} />
              Failed ({failedCount})
            </span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: 0 }}>Recent Follow-ups Needed</h3>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f3ba8', background: 'rgba(15, 59, 168, 0.08)', padding: '2px 8px', borderRadius: '10px' }}>
                Latest 5
              </span>
            </div>
          </div>

          {inboundLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: '13px' }}>
              Loading inbound messages...
            </div>
          ) : inboundReplies.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
              <span style={{ fontSize: '32px', marginBottom: '8px' }}>✨</span>
              <span style={{ fontWeight: '600', color: '#475569', fontSize: '14px', marginBottom: '2px' }}>All caught up!</span>
              <span>No pending inbound replies right now</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {inboundReplies.map((msg) => {
                const contactName = msg.name || `+${msg.phone_number}`;
                let timeStr = "";
                try {
                  timeStr = msg.timestamp ? format(new Date(msg.timestamp), "MMM d, h:mm a") : "";
                } catch (e) {
                  timeStr = "";
                }

                return (
                  <Link
                    key={msg.id}
                    href={`/chat?contact=${msg.contact_id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          color: '#3730a3',
                          fontWeight: '700',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '1px solid #c7d2fe',
                        }}
                      >
                        {contactName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {contactName}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0, fontWeight: '500' }}>
                            {timeStr}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                          {msg.message_body || (msg.type === "image" ? "📷 [Image]" : "Attachment received")}
                        </div>
                      </div>
                    </div>
                    <div style={{ color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
