import { Stack } from 'expo-router';

export default function MainLayout() {
    return (
        <Stack>
            <Stack.Screen name="map" options={{ headerShown: false }} />
        </Stack>
    );
}
