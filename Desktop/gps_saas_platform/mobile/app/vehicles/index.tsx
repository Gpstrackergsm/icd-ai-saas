import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome, Feather } from '@expo/vector-icons'; // Keeping FontAwesome for generic icons locally or switch if needed. 
import { Navigation, CircleParking } from 'lucide-react-native'; // Bringing in consistent icons
import axios from 'axios';
import { useSocket } from '../../hooks/useSocket';
import { API_URL } from '../../constants/Config';

interface Vehicle {
    id: string;
    alias?: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    course?: number;
    lastUpdate: Date;
    address?: string;
    trip_distance?: number;
}

export default function VehicleListScreen() {
    const { token } = useLocalSearchParams();
    const socket = useSocket();
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [loading, setLoading] = useState(true);

    // Geocoding Helper
    const fetchAddress = async (lat: number, lng: number) => {
        try {
            await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'GpsSaasPlatform/1.0' } });
            const data = await res.json();
            return data.display_name || "Adresse inconnue";
        } catch {
            return null;
        }
    };

    // Fetch Initial Data
    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                if (!token) return;

                const res = await axios.get(`${API_URL}/api/devices`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const initialMap: Record<string, Vehicle> = {};
                const devicesToGeocode: Vehicle[] = [];

                res.data.forEach((d: any) => {
                    const v = {
                        id: d.device_id,
                        name: d.name || d.alias || `Vehicle ${d.device_id.slice(-4)}`,
                        lat: parseFloat(d.lat) || 0,
                        lng: parseFloat(d.lng) || 0,
                        speed: parseFloat(d.speed) || 0,
                        course: parseFloat(d.course) || 0,
                        lastUpdate: new Date(d.last_update || Date.now()),
                        address: (d.lat && !isNaN(parseFloat(d.lat)))
                            ? `${parseFloat(d.lat).toFixed(4)}, ${parseFloat(d.lng).toFixed(4)}`
                            : "En attente du GPS..."
                    };
                    initialMap[d.device_id] = v;
                    if (v.lat !== 0) devicesToGeocode.push(v);
                });
                setVehicles(initialMap);
                setLoading(false);

                for (const vehicle of devicesToGeocode) {
                    const addr = await fetchAddress(vehicle.lat, vehicle.lng);
                    if (addr) {
                        setVehicles(prev => ({
                            ...prev,
                            [vehicle.id]: { ...prev[vehicle.id], address: addr }
                        }));
                    }
                }
            } catch (error) {
                console.error("Failed to fetch vehicles:", error);
                setLoading(false);
            }
        };

        fetchVehicles();
    }, [token]);

    // Socket Updates
    useEffect(() => {
        if (!socket) {
            console.log('[VEHICLE LIST] No socket available');
            return;
        }

        console.log('[VEHICLE LIST] Socket connected, setting up position listener');

        socket.on('position', (data: any) => {
            console.log('[VEHICLE LIST] Received position update:', data.deviceId, data.speed);
            setVehicles(prev => {
                const deviceId = data.deviceId;
                const existing = prev[deviceId];
                if (!existing) {
                    console.log('[VEHICLE LIST] Device not in list:', deviceId);
                    return prev;
                }

                return {
                    ...prev,
                    [deviceId]: {
                        ...existing,
                        lat: data.lat,
                        lng: data.lng,
                        speed: data.speed,
                        course: data.course,
                        trip_distance: data.tripDistance,
                        lastUpdate: new Date()
                    }
                };
            });
        });

        return () => {
            console.log('[VEHICLE LIST] Cleaning up socket listener');
            socket.off('position');
        };
    }, [socket]);

    const formatDuration = (date: Date) => {
        const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000);
        if (diff < 1) return "À l'instant";
        if (diff < 60) return `il y a ${diff} min`;
        return `il y a ${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    const renderItem = ({ item }: { item: Vehicle }) => {
        const isMoving = item.speed > 5;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({
                    pathname: '/dashboard',
                    params: { token, focusedVehicleId: item.id }
                })}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: isMoving ? '#dcfce7' : '#fee2e2' }]}>
                        {isMoving ? (
                            <Navigation size={24} color="#16a34a" style={{ transform: [{ rotate: `${item.course || 0}deg` }] }} />
                        ) : (
                            <CircleParking size={24} color="#ef4444" />
                        )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.vehicleName}>{item.name}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: isMoving ? '#16a34a' : '#ef4444' }]} />
                            <Text style={styles.statusText}>{isMoving ? `M (${Math.round(item.speed)} km/h | ${item.trip_distance ? item.trip_distance.toFixed(1) : '0.0'} km)` : 'Stationné'}</Text>
                        </View>
                    </View>
                    <Feather name="navigation" size={20} color="#9ca3af" />
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <FontAwesome name="map-marker" size={14} color="#6b7280" />
                    <Text style={styles.infoText} numberOfLines={1}>{item.address}</Text>
                </View>

                <View style={[styles.infoRow, { marginTop: 4 }]}>
                    <FontAwesome name="clock-o" size={14} color="#6b7280" />
                    <Text style={styles.infoText}>Mis à jour {formatDuration(item.lastUpdate)}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Ma Flotte</Text>
                <TouchableOpacity onPress={() => router.replace('/')} style={styles.logoutBtn}>
                    <Feather name="log-out" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563eb" />
                </View>
            ) : (
                <FlatList
                    data={Object.values(vehicles)}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111' },
    logoutBtn: { padding: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    listContent: { padding: 16 },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    vehicleName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    statusText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    infoText: { fontSize: 13, color: '#6b7280' },
    emptyText: { color: '#9ca3af', fontSize: 16 }
});
