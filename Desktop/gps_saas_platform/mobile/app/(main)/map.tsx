import { StyleSheet, View, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from '../../components/SafeMap';

export default function MapScreen() {
    if (Platform.OS === 'web') {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.webContainer}>
                    <Text style={styles.title}>Map View (Web Mock)</Text>
                    <Text style={styles.subtitle}>
                        react-native-maps nécessite une configuration API pour le Web.
                        Sur un appareil réel, vous verriez la carte Google/Apple ici.
                    </Text>
                    <View style={styles.mockMap}>
                        <Text>📍 Vehicle 1 (Running)</Text>
                        <Text style={{ marginTop: 10 }}>📍 Vehicle 2 (Stopped)</Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                <Marker
                    coordinate={{ latitude: 37.78825, longitude: -122.4324 }}
                    title="Vehicle 1"
                    description="Status: Moving"
                />
            </MapView>
            <SafeAreaView style={styles.overlay} pointerEvents="box-none">
                <View style={styles.header}>
                    <Text style={styles.headerText}>Carte de la Flotte</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
    },
    header: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        margin: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    webContainer: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    mockMap: {
        width: '100%',
        height: 300,
        backgroundColor: '#e1e1e1',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
