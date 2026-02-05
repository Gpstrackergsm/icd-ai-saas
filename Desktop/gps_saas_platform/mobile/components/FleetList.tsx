import React, { useState, useEffect, memo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Navigation, CircleParking, MapPin } from 'lucide-react-native';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';

interface Vehicle {
    id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    course?: number;
    alarm?: string;
    accStatus?: boolean;
    lastUpdate: Date | string;
    status: string;
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    state_start_time?: string | Date;
    trip_distance?: number;
}

interface FleetListProps {
    vehicles: { [key: string]: Vehicle };
    onVehiclePress: (vehicle: Vehicle) => void;
}

// Memoized Item Component to handle individual address fetching
const FleetItem = memo(({ item, onPress }: { item: Vehicle, onPress: (v: Vehicle) => void }) => {
    const [address, setAddress] = useState<string>('Localisation...');
    const [lastFetchCoords, setLastFetchCoords] = useState<{ lat: number, lng: number } | null>(null);

    const isMoving = item.speed > 0;
    const statusColor = isMoving ? '#10B981' : '#F59E0B'; // Green : Amber

    // Icon logic
    const StatusIcon = isMoving ? Navigation : CircleParking;
    const iconStyle = isMoving && item.course ? { transform: [{ rotate: `${item.course}deg` }] } : {};

    const timeString = item.lastUpdate instanceof Date
        ? item.lastUpdate.toLocaleTimeString()
        : new Date(item.lastUpdate).toLocaleTimeString();

    // Duration Logic
    const [durationStr, setDurationStr] = useState('');

    useEffect(() => {
        const updateDuration = () => {
            if (!item.state_start_time) {
                console.log('[TIMER DEBUG] No state_start_time for', item.name);
                setDurationStr('');
                return;
            }
            const start = new Date(item.state_start_time).getTime();
            const now = new Date().getTime();
            const diffMs = now - start;

            console.log('[TIMER DEBUG]', item.name, '| state_start_time:', item.state_start_time, '| start:', start, '| now:', now, '| diff:', diffMs, 'ms');

            if (diffMs < 0) {
                setDurationStr('0s');
                return;
            }

            // Show seconds for debugging
            const totalSeconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);

            if (days > 0) {
                setDurationStr(`${days}j ${hours % 24}h ${minutes % 60}m ${seconds}s`);
            } else if (hours > 0) {
                setDurationStr(`${hours}h ${minutes % 60}m ${seconds}s`);
            } else if (minutes > 0) {
                setDurationStr(`${minutes}m ${seconds}s`);
            } else {
                setDurationStr(`${totalSeconds}s`);
            }
        };

        updateDuration();
        const interval = setInterval(updateDuration, 1000); // Update every second
        return () => clearInterval(interval);
    }, [item.state_start_time]);

    // State Label
    let stateLabel = '';
    let stateColor = '#9CA3AF';

    if (item.current_state === 'moving') {
        stateLabel = 'M';
        stateColor = '#10B981';
    } else if (item.current_state === 'idling') {
        stateLabel = 'Ralenti (Conso)';
        stateColor = '#F59E0B';
    } else if (item.current_state === 'parked') {
        stateLabel = 'Stationné';
        stateColor = '#6B7280'; // Grey
        if (item.accStatus) { // "Fix in same place with acc on" - though logic puts this in idling usually? 
            // Logic says: accel on + speed > 5 = moving. accel on + speed <= 5 = idling. accel off = parked.
            // But let's respect the user request logic if it differs. 
            // User: "fix in same place with acc on" -> Idling.
            // User: "parking after acc off" -> Parked.
        }
    } else {
        stateLabel = isMoving ? 'M' : 'Stationné'; // Fallback
        stateColor = statusColor;
    }

    useEffect(() => {
        const fetchAddress = async () => {
            // Optimization: Don't refetch if moved less than ~50 meters (approx 0.0005 deg)
            if (lastFetchCoords) {
                const diffLat = Math.abs(item.lat - lastFetchCoords.lat);
                const diffLng = Math.abs(item.lng - lastFetchCoords.lng);
                if (diffLat < 0.0005 && diffLng < 0.0005) return;
            }

            try {
                const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${item.lat},${item.lng}&key=${GOOGLE_MAPS_API_KEY}&region=MA`;
                const res = await fetch(url);
                const data = await res.json();

                if (data.results && data.results.length > 0) {
                    // Get a concise address (usually the second result is neighborhood/city, or first formatted)
                    // Let's take the first one but maybe substring it if too long?
                    // Actually first one is usually precise "123 Main St, City..."
                    let addr = data.results[0].formatted_address;
                    // Simplification: Remove country code if at end
                    setAddress(addr);
                    setLastFetchCoords({ lat: item.lat, lng: item.lng });
                } else {
                    setAddress('Position inconnue');
                }
            } catch (error) {
                console.log('Geocoding error:', error);
                setAddress('Adresse indisponible');
            }
        };

        fetchAddress();
    }, [item.lat, item.lng, lastFetchCoords]);

    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)}>
            <View style={[styles.iconContainer, { backgroundColor: `${statusColor}20` }]}>
                <StatusIcon size={24} color={statusColor} style={iconStyle} />
            </View>
            <View style={styles.infoContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.name}>{item.name || `Vehicle ${item.id.slice(-4)}`}</Text>
                    {item.alarm && (
                        <View style={styles.alarmBadge}>
                            <Text style={styles.alarmText}>{item.alarm.toUpperCase()}</Text>
                        </View>
                    )}
                </View>

                {/* Status & Speed & ACC */}
                <View style={styles.statusRow}>
                    <Text style={styles.statusText}>
                        <Text style={{ color: stateColor }}>{stateLabel}</Text>
                        {item.trip_distance !== undefined && item.current_state === 'moving' && (
                            <Text style={{ color: '#7C3AED' }}> {item.trip_distance.toFixed(1)}km</Text>
                        )}
                        {durationStr ? <Text style={{ color: '#6B7280', fontWeight: 'normal' }}> ({durationStr})</Text> : ''}
                    </Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.speed}>{item.speed.toFixed(1)} km/h</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={[styles.statusText, { color: item.accStatus ? '#10B981' : '#9CA3AF', fontSize: 12 }]}>
                        {item.accStatus ? 'ACC ON' : 'ACC OFF'}
                    </Text>
                </View>

                {/* Address Row */}
                <View style={styles.addressRow}>
                    <MapPin size={12} color="#6B7280" style={{ marginTop: 2, marginRight: 4 }} />
                    <Text style={styles.addressText} numberOfLines={1}>
                        {address}
                    </Text>
                </View>

                <Text style={styles.lastSeen}>
                    Dernière mise à jour : {timeString}
                </Text>
            </View>
            <Navigation size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
});

FleetItem.displayName = 'FleetItem';

export default function FleetList({ vehicles, onVehiclePress }: FleetListProps) {
    const vehicleList = Object.values(vehicles);

    if (vehicleList.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun véhicule trouvé</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={vehicleList}
            renderItem={({ item }) => <FleetItem item={item} onPress={onVehiclePress} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    infoContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000', // Strong Black
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6, // Slightly more space
        flexWrap: 'wrap', // Allow wrap if needed
    },
    statusText: {
        fontSize: 14,
        fontWeight: '700', // Bolder
    },
    dot: {
        marginHorizontal: 6,
        color: '#9CA3AF',
    },
    speed: {
        fontSize: 14,
        color: '#2563EB', // Blue for contrast
        fontWeight: '600',
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        paddingRight: 8,
    },
    addressText: {
        fontSize: 13,
        color: '#374151', // Darker gray for visibility
        flex: 1,
        fontWeight: '500',
    },
    lastSeen: {
        fontSize: 12,
        color: '#4B5563', // Darker gray than before
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
    },
    alarmBadge: {
        backgroundColor: '#EF4444',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
        marginBottom: 4,
    },
    alarmText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
