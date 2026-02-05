import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Check, ChevronLeft, ChevronRight } from 'lucide-react-native';

interface SimpleDatePickerProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    title?: string;
}

export default function SimpleDatePicker({ visible, onClose, onSelect, title = "Select Date" }: SimpleDatePickerProps) {
    const [date, setDate] = useState(new Date());

    const adjustDate = (field: 'day' | 'month' | 'year', amount: number) => {
        const newDate = new Date(date);
        if (field === 'day') newDate.setDate(date.getDate() + amount);
        if (field === 'month') newDate.setMonth(date.getMonth() + amount);
        if (field === 'year') newDate.setFullYear(date.getFullYear() + amount);
        setDate(newDate);
    };

    const handleConfirm = () => {
        onSelect(date);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.pickerContainer}>
                        {/* DAY */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Day</Text>
                            <View style={styles.control}>
                                <TouchableOpacity onPress={() => adjustDate('day', -1)} style={styles.btn}>
                                    <ChevronLeft size={20} color="#374151" />
                                </TouchableOpacity>
                                <Text style={styles.value}>{date.getDate()}</Text>
                                <TouchableOpacity onPress={() => adjustDate('day', 1)} style={styles.btn}>
                                    <ChevronRight size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* MONTH */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Month</Text>
                            <View style={styles.control}>
                                <TouchableOpacity onPress={() => adjustDate('month', -1)} style={styles.btn}>
                                    <ChevronLeft size={20} color="#374151" />
                                </TouchableOpacity>
                                <Text style={styles.value}>{date.toLocaleString('default', { month: 'short' })}</Text>
                                <TouchableOpacity onPress={() => adjustDate('month', 1)} style={styles.btn}>
                                    <ChevronRight size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* YEAR */}
                        <View style={styles.row}>
                            <Text style={styles.label}>Year</Text>
                            <View style={styles.control}>
                                <TouchableOpacity onPress={() => adjustDate('year', -1)} style={styles.btn}>
                                    <ChevronLeft size={20} color="#374151" />
                                </TouchableOpacity>
                                <Text style={styles.value}>{date.getFullYear()}</Text>
                                <TouchableOpacity onPress={() => adjustDate('year', 1)} style={styles.btn}>
                                    <ChevronRight size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                        <Check size={20} color="white" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmText}>Confirm Date</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 340,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
    },
    pickerContainer: {
        gap: 16,
        marginBottom: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '500',
    },
    control: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4,
    },
    btn: {
        padding: 8,
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        width: 60,
        textAlign: 'center',
    },
    confirmBtn: {
        backgroundColor: '#2563EB',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    confirmText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
