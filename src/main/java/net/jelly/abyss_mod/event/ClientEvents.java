package net.jelly.abyss_mod.event;

import net.jelly.abyss_mod.AbyssMod;
import net.jelly.abyss_mod.networking.PacketHandler;
import net.jelly.abyss_mod.networking.TestPacket;
import net.jelly.abyss_mod.vfx.SonicBoomPostProcessor;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.PackType;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.InputEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;
import team.lodestar.lodestone.systems.postprocess.PostProcessHandler;


public class ClientEvents {
    // FORGE CLIENT EVENTS
    @Mod.EventBusSubscriber(modid= AbyssMod.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE, value = Dist.CLIENT)
    public static class ForgeClientEvents {
    }





    // MOD CLIENT EVENTS
    @Mod.EventBusSubscriber(modid= AbyssMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
    public static class ModClientEvents {
        // events that implement IModBusEvent are mod bus events

        // shaders
        @SubscribeEvent
        public static void onClientSetup(FMLClientSetupEvent event) {
            // register shaders
            PostProcessHandler.addInstance(SonicBoomPostProcessor.INSTANCE);
        }

        @SubscribeEvent
        public static void registerRenderers(FMLClientSetupEvent event) {
        }

    }


}
