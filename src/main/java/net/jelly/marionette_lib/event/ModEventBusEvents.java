package net.jelly.marionette_lib.event;

import net.jelly.marionette_lib.MarionetteMod;
import net.jelly.marionette_lib.entity.ModEntities;
import net.jelly.marionette_lib.entity.examples.octopus.OctopusEntity;
import net.jelly.marionette_lib.entity.examples.worm.WormEntity;
import net.jelly.marionette_lib.entity.examples.wyvern.WyvernEntity;
import net.minecraftforge.event.entity.EntityAttributeCreationEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;

@Mod.EventBusSubscriber(modid= MarionetteMod.MODID, bus = Mod.EventBusSubscriber.Bus.MOD)
public class ModEventBusEvents {

    // events that implement IModBusEvent are mod bus events
    @SubscribeEvent
    public static void registerAttributes(EntityAttributeCreationEvent event) {
        event.put(ModEntities.WORM.get(), WormEntity.createAttributes().build());
        event.put(ModEntities.OCTOPUS.get(), OctopusEntity.createAttributes().build());
        event.put(ModEntities.WYVERN.get(), WyvernEntity.createAttributes().build());
    }

}
