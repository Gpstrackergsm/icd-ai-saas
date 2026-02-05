import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

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
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    state_start_time?: string | Date;
}

interface VehicleDetailCardProps {
    vehicle: Vehicle;
    onHistorySelect?: (period: string) => void;
    onClearHistory?: () => void;
}

export default function VehicleDetailCard({ vehicle, onHistorySelect, onClearHistory }: VehicleDetailCardProps) {
    const handleHistory = (period: string) => {
        if (onHistorySelect) {
            onHistorySelect(period);
        }
    };

    return (
        <View style={styles.vehicleCard}>
            {/* History Controls Only */}
            <View style={styles.historyContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.historyLabel}>Historique:</Text>
                    {onClearHistory && (
                        <TouchableOpacity onPress={onClearHistory} style={{ padding: 4 }}>
                            <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Effacer</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.historyButtonsRow}>
                    <TouchableOpacity style={styles.historyBtn} onPress={() => handleHistory('custom')}>
                        <Text style={styles.historyBtnText}>Custom</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.historyBtn} onPress={() => handleHistory('today')}>
                        <Text style={styles.historyBtnText}>Today</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.historyBtn} onPress={() => handleHistory('12h')}>
                        <Text style={styles.historyBtnText}>Last 12H</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.historyBtn} onPress={() => handleHistory('6h')}>
                        <Text style={styles.historyBtnText}>Last 6H</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    vehicleCard: {
        position: 'absolute',
        bottom: 40,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        paddingTop: 8, // Reduced padding
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
    },
    // Removed unused styles (cardHeader, cardTitle, speedBadge, etc.)
    historyContainer: {
        marginTop: 0, // No margin needed as it's the only content
        // borderTopWidth: 0, // Removed border
    },
    historyLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 8,
        fontWeight: '600',
    },
    historyButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    historyBtn: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 8,
        paddingHorizontal: 10, // Slightly reduced horizontal padding
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 2, // Tighter margins
    },
    historyBtnText: {
        fontSize: 11,
        color: '#374151',
        fontWeight: '600',
    }
});
