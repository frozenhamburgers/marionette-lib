package net.jelly.abyss_mod.event;

import net.jelly.abyss_mod.AbyssMod;
import net.jelly.abyss_mod.entity.examples.octopus.OctopusModel;
import net.jelly.abyss_mod.entity.examples.octopus.OctopusRenderer;
import net.jelly.abyss_mod.entity.examples.worm.WormModel;
import net.jelly.abyss_mod.entity.examples.worm.WormRenderer;
import net.jelly.abyss_mod.entity.examples.wyvern.WyvernModel;
import net.jelly.abyss_mod.entity.examples.wyvern.WyvernRenderer;
import net.jelly.abyss_mod.vfx.SonicBoomPostProcessor;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.EntityRenderersEvent;
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

        @SubscribeEvent
        public static void registerLayer(EntityRenderersEvent.RegisterLayerDefinitions event) {
            event.registerLayerDefinition(WormRenderer.WORM_LAYER, WormModel::createBodyLayer);
            event.registerLayerDefinition(OctopusRenderer.OCTOPUS_LAYER, OctopusModel::createBodyLayer);
            event.registerLayerDefinition(WyvernRenderer.WYVERN_LAYER, WyvernModel::createBodyLayer);
        }

    }


}
