import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { SERVER_URL } from '../api/axios';
import { User, Bell, Shield, Palette, Globe, Upload, Camera, Trash2 } from '../shims/lucide-react';

const SettingsPage = () => {
    const { user, updateProfile, resetProfileImage } = useAuth();
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [isUpdating, setIsUpdating] = useState(false);
    const [uploading, setUploading] = useState(false);
    
    // Resolve image URL
    const getProfileImage = (path) => {
        if (!path) return 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        if (path.startsWith('http')) return path;
        return `${SERVER_URL}${path}`;
    };

    const [profileImagePreview, setProfileImagePreview] = useState(getProfileImage(user?.profileImage));
    
    // Missing States
    const [currency, setCurrency] = useState('USD');
    const [theme, setTheme] = useState('light');
    const [notifications, setNotifications] = useState({
        email: true,
        alerts: true,
    });

    const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    ];

    const toggleNotification = (id) => {
        setNotifications(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Keep preview in sync with user object (important for updates!)
    React.useEffect(() => {
        setProfileImagePreview(getProfileImage(user?.profileImage));
        setFullName(user?.fullName || '');
    }, [user]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const res = await api.post('/auth/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Update local state and auth context
            const newPath = res.data.profileImage;
            setProfileImagePreview(getProfileImage(newPath));
            await updateProfile({ fullName }); 
            alert('Image uploaded successfully!');
        } catch (error) {
            console.error('Upload failed', error);
            alert('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleResetImage = async () => {
        if (!window.confirm('Are you sure you want to reset your profile photo?')) return;
        
        try {
            const defaultUrl = await resetProfileImage();
            setProfileImagePreview(getProfileImage(defaultUrl));
            alert('Profile photo reset to default');
        } catch (error) {
            alert('Failed to reset profile photo');
        }
    };

    const handleSaveProfile = async () => {
        setIsUpdating(true);
        try {
            await updateProfile({ fullName });
            alert('Profile details updated!');
        } catch (error) {
            alert('Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

    const isDefaultAvatar = !user?.profileImage || user.profileImage.includes('149/149071.png');

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

            {/* Profile Section */}
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <User className="text-primary" size={20} />
                        <h2 className="font-semibold text-gray-800">Profile Information</h2>
                    </div>
                    <button 
                        onClick={handleSaveProfile}
                        disabled={isUpdating}
                        className="text-sm bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isUpdating ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-md bg-gray-100 flex items-center justify-center">
                                <img 
                                    src={profileImagePreview} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                                {uploading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Control Buttons - Positioned beside each other below the photo */}
                            <div className="flex items-center justify-center mt-4 space-x-3">
                                <label 
                                    className="bg-primary text-white p-2.5 rounded-xl shadow-lg cursor-pointer hover:bg-primary/90 transition-all flex items-center space-x-2" 
                                    title="Upload Photo"
                                >
                                    <Camera size={18} />
                                    <span className="text-xs font-semibold">Change</span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        onChange={handleImageUpload}
                                        accept="image/*"
                                    />
                                </label>
                                
                                {!isDefaultAvatar && (
                                    <button 
                                        onClick={handleResetImage}
                                        type="button"
                                        title="Remove Photo"
                                        className="bg-white text-red-500 p-2.5 rounded-xl shadow-md hover:bg-red-50 border border-red-100 transition-all flex items-center space-x-2"
                                    >
                                        <Trash2 size={18} />
                                        <span className="text-xs font-semibold">Remove</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                                <input 
                                    type="text" 
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Enter your full name"
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Email Address (Read-only)</label>
                                <input 
                                    type="email" 
                                    disabled 
                                    value={user?.email || ''} 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Account Role</label>
                                <input 
                                    type="text" 
                                    disabled 
                                    value={user?.role || ''} 
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed capitalize"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Application Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Currency & Theme */}
                <div className="space-y-8">
                    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center space-x-3">
                            <Globe className="text-primary" size={20} />
                            <h2 className="font-semibold text-gray-800">Regional & Theme</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Currency</label>
                                <select 
                                    value={currency} 
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                >
                                    {currencies.map((c) => (
                                        <option key={c.code} value={c.code}>{c.symbol} - {c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Appearance</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => setTheme('light')}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <div className="w-full h-12 bg-gray-100 rounded-md mb-1 border shadow-inner"></div>
                                        <span className="text-xs font-medium">Light Mode</span>
                                    </button>
                                    <button 
                                        onClick={() => setTheme('dark')}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <div className="w-full h-12 bg-gray-900 rounded-md mb-1 border shadow-inner"></div>
                                        <span className="text-xs font-medium">Dark Mode</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Notifications & Security */}
                <div className="space-y-8">
                    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center space-x-3">
                            <Bell className="text-primary" size={20} />
                            <h2 className="font-semibold text-gray-800">Notifications</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            {[
                                { id: 'email', label: 'Email Notifications', desc: 'Summary of weekly expenses' },
                                { id: 'alerts', label: 'Budget Alerts', desc: 'Notify when approaching limits' },
                            ].map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                    </div>
                                    <button 
                                        onClick={() => toggleNotification(item.id)}
                                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${notifications[item.id] ? 'bg-primary' : 'bg-gray-200'}`}
                                    >
                                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform transform ${notifications[item.id] ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center space-x-3">
                            <Shield className="text-primary" size={20} />
                            <h2 className="font-semibold text-gray-800">Security</h2>
                        </div>
                        <div className="p-6 items-center">
                            <button className="text-sm text-primary font-medium hover:underline">Change Account Password</button>
                        </div>
                    </section>
                </div>
            </div>
            
            <div className="flex justify-end">
                <button className="px-8 py-2.5 bg-primary text-white rounded-lg font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;

