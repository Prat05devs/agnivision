import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import { enableScreens } from "react-native-screens";

import "./src/notifications/backgroundLocationTask";
import App from "./App";

enableScreens(true);
registerRootComponent(App);
