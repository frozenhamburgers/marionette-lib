package net.jelly.marionette_lib.event;

import net.jelly.marionette_lib.MarionetteMod;
import net.jelly.marionette_lib.entity.examples.octopus.OctopusModel;
import net.jelly.marionette_lib.entity.examples.octopus.OctopusRenderer;
import net.jelly.marionette_lib.entity.examples.worm.WormModel;
import net.jelly.marionette_lib.entity.examples.worm.WormRenderer;
import net.jelly.marionette_lib.entity.examples.wyvern.WyvernModel;
import net.jelly.marionette_lib.entity.examples.wyvern.WyvernRenderer;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;


public class ClientEvents {
    // FORGE CLIENT EVENTS
    @Mod.EventBusSubscriber(modid= MarionetteMod.MODID, bus = Mod.EventBusSubscriber.Bus.FORGE, value = Dist.CLIENT)
    public static class ForgeClientEvents {
    }





    // MOD CLIENT EVENTS
    @Mod.EventBusSubscriber(modid= MarionetteMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
    public static class ModClientEvents {
        // events that implement IModBusEvent are mod bus events

        // shaders
        @SubscribeEvent
        public static void onClientSetup(FMLClientSetupEvent event) {
            // register shaders
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
