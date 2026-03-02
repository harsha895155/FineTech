import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Check, X, User } from '../shims/lucide-react';

const Admin = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('transactions');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEmployee, setNewEmployee] = useState({ fullName: '', email: '', password: '', phoneNumber: '', role: 'employee' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const usersRes = await api.get('/admin/users');
            setUsers(usersRes.data.data || []);

            const txRes = await api.get('/admin/transactions/pending');
            setPendingTransactions(txRes.data.data || []);
        } catch (err) {
            console.error("Error fetching admin data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleTransactionStatus = async (id, status, reason = '') => {
        try {
            await api.put(`/admin/transactions/${id}/status`, { status, rejectionReason: reason });
            // Refresh list
            setPendingTransactions(pendingTransactions.filter(tx => tx._id !== id));
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update transaction status");
        }
    };

    const handleEmployeeSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/admin/employees', newEmployee);
            setUsers([...users, res.data.data]);
            setShowAddForm(false);
            setNewEmployee({ fullName: '', email: '', password: '', phoneNumber: '', role: 'employee' });
            alert("Account created successfully!");
        } catch (err) {
            console.error("Failed to add user", err);
            alert(err.response?.data?.message || err.response?.data?.error || "Failed to add user");
        }
    };

    const allowedRoles = ['administrator', 'admin'];
    if (!allowedRoles.includes(user?.role)) {
        return <div className="p-4 text-red-500">Access Denied. You do not have admin privileges.</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            
            {/* Tabs */}
            <div className="flex space-x-4 border-b">
                <button
                    className={`pb-2 px-4 ${activeTab === 'transactions' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('transactions')}
                >
                    Pending Approvals ({pendingTransactions.length})
                </button>
                <button
                    className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-primary text-primary font-medium' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('users')}
                >
                    Team Members ({users.length})
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    {activeTab === 'transactions' && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4">Expense Approval Queue</h2>
                            {pendingTransactions.length === 0 ? (
                                <p className="text-gray-500">No pending expenses to approve.</p>
                            ) : (
                                <div className="space-y-4">
                                    {pendingTransactions.map(tx => (
                                        <div key={tx._id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                                            <div>
                                                <p className="font-medium text-gray-900">{tx.description || 'No description'}</p>
                                                <p className="text-sm text-gray-500">
                                                    {tx.user?.fullName} • {new Date(tx.date).toLocaleDateString()} • {tx.category}
                                                </p>
                                                <p className="font-bold text-gray-800 mt-1">${tx.amount}</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleTransactionStatus(tx._id, 'approved')}
                                                    className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200"
                                                    title="Approve"
                                                >
                                                    <Check size={20} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt("Enter rejection reason:");
                                                        if (reason) handleTransactionStatus(tx._id, 'rejected', reason);
                                                    }}
                                                    className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200"
                                                    title="Reject"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-semibold">Organization Members</h2>
                                <button 
                                    onClick={() => setShowAddForm(!showAddForm)}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                                >
                                    {showAddForm ? 'Cancel' : 'Add Employee'}
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleEmployeeSubmit} className="bg-gray-50 p-4 border rounded-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                                        <input 
                                            type="text" required 
                                            value={newEmployee.fullName} 
                                            onChange={(e) => setNewEmployee({...newEmployee, fullName: e.target.value})}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                                        <input 
                                            type="email" required 
                                            value={newEmployee.email} 
                                            onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Phone Number</label>
                                        <input 
                                            type="text" required 
                                            value={newEmployee.phoneNumber} 
                                            onChange={(e) => setNewEmployee({...newEmployee, phoneNumber: e.target.value})}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                                        <select 
                                            value={newEmployee.role} 
                                            onChange={(e) => setNewEmployee({...newEmployee, role: e.target.value})}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        >
                                            <option value="employee">Employee</option>
                                            <option value="admin">Admin</option>
                                            <option value="administrator">Administrator</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 lg:col-span-1">
                                        <label className="block text-xs font-medium text-gray-500 mb-1">Temporary Password</label>
                                        <input 
                                            type="password" required 
                                            value={newEmployee.password} 
                                            onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        />
                                    </div>
                                    <div className="lg:col-span-3 flex justify-end mt-2">
                                        <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-medium shadow-sm hover:bg-primary/90 transition-all w-full md:w-auto">
                                            Create User Account
                                        </button>
                                    </div>
                                </form>
                            )}

                             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {users.map(u => (
                                    <div key={u._id} className="flex items-center space-x-3 p-4 border rounded-lg">
                                        <div className="bg-gray-200 p-2 rounded-full overflow-hidden w-12 h-12 flex items-center justify-center">
                                            {u.profileImage ? (
                                                <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={24} className="text-gray-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{u.fullName}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                            <div className="flex space-x-1 mt-1">
                                                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full capitalize font-semibold">{u.role}</span>
                                                {u.phoneNumber && <span className="text-[10px] text-gray-400">{u.phoneNumber}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Admin;
