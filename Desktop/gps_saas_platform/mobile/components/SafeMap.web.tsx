import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Marker = (props: any) => null;
export const PROVIDER_GOOGLE = 'google';

const MapView = React.forwardRef((props: any, ref: any) => {
    return (
        <View style={styles.container}>
            <Text>Map View (Web Mock)</Text>
            {props.children}
        </View>
    );
});

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eee',
    },
});

export default MapView;
