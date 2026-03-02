import React from 'react';
import { Link, useNavigate, useLocation } from '../shims/react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SERVER_URL } from '../api/axios';
import { LayoutDashboard, Receipt, PieChart, Settings, LogOut, Briefcase } from '../shims/lucide-react';

const Layout = ({ children }) => {
    const { user, logout } = useAuth();

    const getProfileImage = (path) => {
        if (!path) return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        if (path.startsWith('http')) return path;
        return `${SERVER_URL}${path}`;
    };
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Transactions', path: '/transactions', icon: Receipt },
        { name: 'Reports', path: '/reports', icon: PieChart },
        ...(['admin', 'administrator'].includes(user?.role) ? [{ name: 'Admin', path: '/admin', icon: Briefcase }] : []),
        { name: 'Settings', path: '/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-md hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <div className="flex items-center space-x-3 mb-4">
                        <img 
                            src={getProfileImage(user?.profileImage)} 
                            alt="Profile" 
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
                        />
                        <div>
                            <h1 className="text-xl font-bold text-primary leading-tight">ExpensePro</h1>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">{user?.role}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Hello, {user?.fullName?.split(' ')[0]}</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    location.pathname === item.path
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <Icon size={20} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Mobile Header (basic) */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
                    <h1 className="font-bold text-primary">ExpenseTracker</h1>
                    <button onClick={handleLogout} className="text-red-500"><LogOut size={20}/></button>
                </header>
                
                {/* Main Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
