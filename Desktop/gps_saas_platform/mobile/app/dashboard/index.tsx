import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { useSocket } from '../../hooks/useSocket';
import { Stack, useRouter } from 'expo-router';
import { Navigation, Menu, LogOut, Car, List, Map as MapIcon, CircleParking } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants/Config';

// Import our platform-safe wrapper
// Removed duplicate imports
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '../../components/SafeMap';
import FleetList from '../../components/FleetList';
import VehicleDetailCard from '../../components/VehicleDetailCard';
import SimpleDatePicker from '../../components/SimpleDatePicker';

const DEFAULT_REGION = {
    latitude: 33.5731,
    longitude: -7.5898,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

interface Vehicle {
    id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    trip_distance?: number;
    course?: number;
    alarm?: string;
    accStatus?: boolean;
    lastUpdate: Date | string;
    status: string;
    last_update?: string; // API uses this
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    state_start_time?: string | Date;
}

interface HistoryPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    id: string;
}

export default function Dashboard() {
    const router = useRouter();
    const socket = useSocket();
    const mapRef = useRef<any>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const lastTrackedVehicleId = useRef<string | null>(null);
    const [durationStr, setDurationStr] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // Default to List

    // Duration Timer Logic for Selected Vehicle
    useEffect(() => {
        let interval: any;

        const updateDuration = () => {
            if (!selectedVehicle || !vehicles[selectedVehicle.id] || !vehicles[selectedVehicle.id].state_start_time) {
                setDurationStr('');
                return;
            }

            const v = vehicles[selectedVehicle.id];
            const start = new Date(v.state_start_time!).getTime();
            const now = new Date().getTime();
            const diffMs = now - start;

            if (diffMs < 0) {
                setDurationStr('0s');
                return;
            }

            const totalSeconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                setDurationStr(`${days}j ${hours % 24}h`);
            } else if (hours > 0) {
                setDurationStr(`${hours}h ${minutes % 60}m`);
            } else {
                setDurationStr(`${minutes}m ${seconds}s`);
            }
        };

        updateDuration(); // Initial call
        interval = setInterval(updateDuration, 1000); // Update every second

        return () => clearInterval(interval);
    }, [selectedVehicle, vehicles]); // Re-run when vehicle or data changes

    // 1. Initial Data Fetch
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                // Get token
                let token;
                if (Platform.OS !== 'web') {
                    token = await SecureStore.getItemAsync('auth_token');
                } else {
                    token = localStorage.getItem('auth_token');
                }

                if (!token) {
                    console.log("No token found, redirecting to login");
                    router.replace('/');
                    return;
                }

                console.log(`Fetching devices from ${API_URL}/api/devices`);
                const res = await axios.get(`${API_URL}/api/devices`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const devices = res.data;
                console.log("Devices fetched:", devices.length);

                const initialMap: Record<string, Vehicle> = {};
                devices.forEach((d: any) => {
                    // Handle case where position might be null if device never reported
                    const lat = parseFloat(d.lat || d.last_lat);
                    const lng = parseFloat(d.lng || d.last_lng);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        initialMap[d.device_id] = {
                            id: d.device_id,
                            name: d.name || `Vehicle ${d.device_id.slice(-4)}`,
                            lat: lat,
                            lng: lng,
                            speed: parseFloat(d.speed) || 0,
                            course: parseFloat(d.course) || 0,
                            alarm: d.alarm || undefined,
                            accStatus: d.acc_status === 1 || d.acc_status === true,
                            lastUpdate: new Date(d.last_update || Date.now()),
                            status: d.status,
                            last_update: d.last_update, // Keep raw string for UI
                            current_state: d.current_state,
                            state_start_time: d.state_start_time
                        };
                    }
                });
                setVehicles(initialMap);

                // Auto-zoom to vehicles if in map mode (or just calc it ready)
                const coords = Object.values(initialMap).map(v => ({ latitude: v.lat, longitude: v.lng }));
                if (coords.length > 0 && mapRef.current) {
                    setTimeout(() => {
                        mapRef.current.fitToCoordinates(coords, {
                            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                            animated: true
                        });
                    }, 1000);
                }

            } catch (error) {
                console.error("Failed to fetch initial devices:", error);
                Alert.alert("Erreur", "Impossible de récupérer les données des véhicules.");
            }
        };

        fetchVehicles();
    }, []);

    // 2. Listen for Socket Updates
    useEffect(() => {
        if (!socket) return;

        socket.on('position', (data: any) => {
            console.log('Mobile Socket Data:', data);

            setVehicles(prev => {
                const deviceId = data.deviceId;
                const existing = prev[deviceId];

                // Only update state_start_time if state actually changed
                const stateChanged = existing?.current_state !== data.state;
                const newStateStartTime = stateChanged ? data.stateStartTime : (existing?.state_start_time || data.stateStartTime);

                const updatedVehicle: Vehicle = {
                    id: deviceId,
                    name: existing?.name || `Vehicle ${deviceId.slice(-4)}`,
                    lat: data.lat,
                    lng: data.lng,
                    speed: data.speed,
                    trip_distance: data.tripDistance,
                    course: data.course,
                    alarm: data.alarm,
                    accStatus: data.accStatus,
                    lastUpdate: new Date(),
                    status: 'online',
                    last_update: new Date().toISOString(),
                    current_state: data.state, // Socket uses 'state'
                    state_start_time: newStateStartTime // Only update if state changed!
                };

                return {
                    ...prev,
                    [deviceId]: updatedVehicle
                };
            });
        });

        return () => {
            socket.off('position');
        };
    }, [socket]);

    const handleLogout = async () => {
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('auth_token');
        } else {
            localStorage.removeItem('auth_token');
        }
        router.replace('/');
    };

    const [historyPath, setHistoryPath] = useState<HistoryPoint[]>([]);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [pickerStep, setPickerStep] = useState<'start' | 'end'>('start');
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [selectedPoints, setSelectedPoints] = useState<HistoryPoint[]>([]);

    const onDateSelect = (date: Date) => {
        if (pickerStep === 'start') {
            setCustomStartDate(date);
            setPickerStep('end');
        } else {
            setDatePickerVisible(false);
            if (customStartDate && selectedVehicle) {
                const start = customStartDate;
                start.setHours(0, 0, 0, 0); // Start of start day

                const end = date;
                end.setHours(23, 59, 59, 999); // End of end day

                fetchHistoryDirect(selectedVehicle.id, start, end);
            }
        }
    };

    const fetchHistoryDirect = async (vehicleId: string, start: Date, end: Date) => {
        try {
            let token;
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('auth_token');
            } else {
                token = localStorage.getItem('auth_token');
            }
            if (!token) return;

            const startISO = start.toISOString();
            const endISO = end.toISOString();

            console.log(`Fetching history for ${vehicleId} from ${startISO} to ${endISO}`);
            const res = await axios.get(`${API_URL}/api/devices/${vehicleId}/history`, {
                params: { start: startISO, end: endISO },
                headers: { Authorization: `Bearer ${token}` }
            });

            const path: HistoryPoint[] = res.data.map((p: any) => ({
                latitude: p.lat,
                longitude: p.lng,
                timestamp: p.timestamp,
                speed: p.speed,
                id: p.id || Math.random().toString()
            }));

            setHistoryPath(path);
            setSelectedPoints([]); // Reset selection on new fetch

            if (path.length > 0 && mapRef.current) {
                mapRef.current.fitToCoordinates(path, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true
                });
            } else {
                Alert.alert('Info', 'Aucun historique trouvé pour cette période.');
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            Alert.alert('Erreur', 'Impossible de récupérer l\'historique.');
        }
    }

    const fetchHistory = async (vehicleId: string, period: string) => {
        try {
            const now = new Date();
            let start = new Date();

            if (period === 'custom') {
                setPickerStep('start');
                setDatePickerVisible(true);
                return;
            }

            switch (period) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    break;
                case '12h':
                    start.setHours(now.getHours() - 12);
                    break;
                case '6h':
                    start.setHours(now.getHours() - 6);
                    break;
            }

            // Add buffer to end time (e.g. +1 hour) to handle potential device/server clock skew
            const endBuffer = new Date(now.getTime() + 60 * 60 * 1000);
            fetchHistoryDirect(vehicleId, start, endBuffer);

        } catch (error) {
            console.error('Failed to prepare history fetch:', error);
        }
    };

    const handleVehiclePress = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setHistoryPath([]); // Clear previous history when selecting new vehicle
        setViewMode('map');
    };



    // Effect to handle map animation when switching views or selecting vehicle
    useEffect(() => {
        if (viewMode === 'map' && selectedVehicle && mapRef.current && vehicles[selectedVehicle.id]) {
            // Find the *latest* data for this vehicle from the main state
            const latestVehicleData = vehicles[selectedVehicle.id];

            if (latestVehicleData) {
                // If this is a NEW vehicle selection, set the region (standard zoom)
                if (selectedVehicle.id !== lastTrackedVehicleId.current) {
                    mapRef.current.animateToRegion({
                        latitude: latestVehicleData.lat,
                        longitude: latestVehicleData.lng,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02
                    }, 500);
                    lastTrackedVehicleId.current = selectedVehicle.id;
                } else if (historyPath.length === 0) {
                    // SAME vehicle updating? Just move camera center (preserve User's zoom)
                    // ONLY if we are NOT viewing history
                    mapRef.current.animateCamera({
                        center: {
                            latitude: latestVehicleData.lat,
                            longitude: latestVehicleData.lng,
                        }
                    }, { duration: 500 });
                }
            }
        }
    }, [viewMode, selectedVehicle, vehicles, historyPath]); // Add 'vehicles' and 'historyPath' dependency to trigger on updates

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };

    const handlePointPress = (point: HistoryPoint) => {
        setSelectedPoints(prev => {
            if (prev.length === 0) return [point];
            if (prev.length === 1) return [...prev, point]; // Select 2nd point
            return [point]; // Reset and select new start point
        });
    };

    const renderAnalysisCard = () => {
        if (selectedPoints.length !== 2) return null;

        const [p1, p2] = selectedPoints;
        const time1 = new Date(p1.timestamp).getTime();
        const time2 = new Date(p2.timestamp).getTime();

        // Ensure accurate order
        const start = time1 < time2 ? p1 : p2;
        const end = time1 < time2 ? p2 : p1;
        const startTime = time1 < time2 ? time1 : time2;
        const endTime = time1 < time2 ? time2 : time1;

        const diffMs = endTime - startTime;
        const distance = getDistance(start.latitude, start.longitude, end.latitude, end.longitude);

        // Format Duration
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const durationStr = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

        return (
            <View style={styles.analysisCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.cardTitle}>Analyse Trajet</Text>
                    <TouchableOpacity onPress={() => setSelectedPoints([])}>
                        <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Fermer</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Distance:</Text>
                    <Text style={styles.analysisValue}>{distance.toFixed(2)} km</Text>
                </View>
                <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Durée:</Text>
                    <Text style={styles.analysisValue}>{durationStr}</Text>
                </View>
                <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Vitesse Moy:</Text>
                    <Text style={styles.analysisValue}>{((distance / (totalSeconds / 3600)) || 0).toFixed(1)} km/h</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#1F2937', marginTop: 8, fontWeight: '500' }}>
                    De {new Date(startTime).toLocaleTimeString()} à {new Date(endTime).toLocaleTimeString()}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header Overlay */}
            <SafeAreaView style={styles.headerContainer} edges={['top']}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerTitle}>
                            {selectedVehicle ? selectedVehicle.name : "Suivi de Flotte"}
                        </Text>

                        {selectedVehicle && vehicles[selectedVehicle.id] && (
                            <View style={{ marginTop: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    {/* Speed & Status */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 6, height: 6, borderRadius: 3,
                                            backgroundColor: vehicles[selectedVehicle.id].speed > 0 ? '#10B981' : '#F59E0B',
                                            marginRight: 4
                                        }} />
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111' }}>
                                            {vehicles[selectedVehicle.id].speed > 0 ? `${Math.round(vehicles[selectedVehicle.id].speed)} km/h` : 'Stop'}
                                        </Text>
                                    </View>

                                    <Text style={{ fontSize: 12, color: '#ccc' }}>|</Text>

                                    {/* ACC Status */}
                                    <Text style={{
                                        fontSize: 11, fontWeight: '600',
                                        color: vehicles[selectedVehicle.id].accStatus ? '#10B981' : '#9CA3AF'
                                    }}>
                                        {vehicles[selectedVehicle.id].accStatus ? 'ACC ON' : 'ACC OFF'}
                                    </Text>
                                </View>

                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                                    {/* Mileage */}
                                    {vehicles[selectedVehicle.id].trip_distance !== undefined && (
                                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                            Trip: <Text style={{ color: '#7C3AED', fontWeight: 'bold' }}>{vehicles[selectedVehicle.id].trip_distance?.toFixed(1)}km</Text>
                                        </Text>
                                    )}

                                    {/* Duration */}
                                    {durationStr ? (
                                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                            ({durationStr})
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => setViewMode(m => m === 'list' ? 'map' : 'list')}
                        >
                            {viewMode === 'list' ? (
                                <MapIcon size={20} color="#111" />
                            ) : (
                                <List size={20} color="#111" />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <LogOut size={20} color="#ef4444" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            <View style={styles.contentContainer}>
                {viewMode === 'list' ? (
                    <View style={{ paddingTop: 80, flex: 1 }}>
                        <FleetList
                            vehicles={vehicles}
                            onVehiclePress={handleVehiclePress}
                        />
                    </View>
                ) : (
                    <MapView
                        provider={PROVIDER_GOOGLE}
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={DEFAULT_REGION}
                        showsUserLocation={true}
                        showsMyLocationButton={true}
                        mapType="hybrid"
                    >
                        {Object.values(vehicles).map(vehicle => (
                            <Marker
                                key={vehicle.id}
                                coordinate={{ latitude: vehicle.lat, longitude: vehicle.lng }}
                                title={vehicle.name}
                                description={`Speed: ${Math.round(vehicle.speed)} km/h`}
                                onPress={() => setSelectedVehicle(vehicle)}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={styles.markerBubble}>
                                        <Text style={styles.markerText}>{vehicle.name}</Text>
                                    </View>
                                    {vehicle.speed > 0 ? (
                                        <Navigation
                                            size={24}
                                            color="#10B981"
                                            fill="#10B981"
                                            style={{ transform: [{ rotate: `${vehicle.course || 0}deg` }] }}
                                        />
                                    ) : (
                                        <CircleParking size={24} color="#F59E0B" fill="#F59E0B" />
                                    )}
                                </View>
                            </Marker>
                        ))}

                        {historyPath.length > 0 && (
                            <>
                                <Polyline
                                    coordinates={historyPath}
                                    strokeColor="#4F46E5" // Indigo-600
                                    strokeWidth={4}
                                />
                                {/* Render interactive dots - subsampled */}
                                {historyPath.filter((_, i) => i % 10 === 0 || i === 0 || i === historyPath.length - 1).map((point, index) => {
                                    const isSelected = selectedPoints.some(p => p.id === point.id);
                                    return (
                                        <Marker
                                            key={`hist-${index}`}
                                            coordinate={point}
                                            anchor={{ x: 0.5, y: 0.5 }}
                                            onPress={(e) => {
                                                e.stopPropagation(); // Prevent map click?
                                                handlePointPress(point);
                                            }}
                                        >
                                            <View style={{
                                                width: isSelected ? 16 : 8,
                                                height: isSelected ? 16 : 8,
                                                borderRadius: isSelected ? 8 : 4,
                                                backgroundColor: isSelected ? '#EF4444' : 'rgba(79, 70, 229, 0.8)',
                                                borderWidth: 1,
                                                borderColor: 'white'
                                            }} />
                                        </Marker>
                                    );
                                })}
                            </>
                        )}
                    </MapView>
                )}
            </View>

            {selectedPoints.length === 2 && renderAnalysisCard()}

            {viewMode === 'map' && selectedVehicle && vehicles[selectedVehicle.id] && (
                <VehicleDetailCard
                    vehicle={vehicles[selectedVehicle.id]}
                    onHistorySelect={(period) => fetchHistory(selectedVehicle.id, period)}
                    onClearHistory={historyPath.length > 0 ? () => { setHistoryPath([]); setSelectedPoints([]); } : undefined}
                />
            )}

            <SimpleDatePicker
                visible={datePickerVisible}
                onClose={() => setDatePickerVisible(false)}
                onSelect={onDateSelect}
                title={pickerStep === 'start' ? "Date de début" : "Date de fin"}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    contentContainer: {
        flex: 1,
    },
    map: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    toggleButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f3f4f6',
    },
    logoutButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#fee2e2',
    },
    markerContainer: {
        alignItems: 'center',
    },
    markerBubble: {
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    markerText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
    },
    vehicleCard: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#6b7280',
    },
    speedBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
    },
    speedText: {
        color: '#1e40af',
        fontWeight: 'bold',
        fontSize: 14,
    },
    analysisCard: {
        position: 'absolute',
        bottom: 180, // Above vehicle card
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 50,
    },
    analysisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    analysisLabel: {
        color: '#374151', // Darker grey (Gray-700)
        fontSize: 14,
        fontWeight: '500',
    },
    analysisValue: {
        fontWeight: 'bold',
        color: '#111',
        fontSize: 14,
    }
});
