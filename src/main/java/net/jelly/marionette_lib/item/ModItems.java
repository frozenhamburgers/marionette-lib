package net.jelly.marionette_lib.item;

import net.jelly.marionette_lib.MarionetteMod;
import net.minecraft.world.item.Item;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;

public class ModItems { // holds all items in mod
    // deferredregister is a big list of items that are registered as a certain time as forge loads the items
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, MarionetteMod.MODID);
    public static void register(IEventBus eventBus) {
        ITEMS.register(eventBus);
    }


}
