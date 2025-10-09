package net.jelly.abyss_mod.event;

import net.jelly.abyss_mod.AbyssMod;
import net.minecraftforge.event.RegisterCommandsEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid = AbyssMod.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE)
public class ForgeEventHandler {
    // COMMANDS
    // RegisterCommands is for server commands, RegisterClientCommands for client commands
    @SubscribeEvent
    public static void RegisterModCommands(RegisterCommandsEvent event) {
        // Register your custom command during the register commands event
//        FabrikForwardCommand.register(event.getDispatcher());
//        FabrikBackwardCommand.register(event.getDispatcher());
//        WormBreachCommand.register(event.getDispatcher());
    }


}

